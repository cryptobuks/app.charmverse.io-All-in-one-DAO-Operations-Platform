
import path from 'node:path';

import type { Prisma, Space } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';

import { prisma } from 'db';
import { generateDefaultPropertiesInput } from 'lib/members/generateDefaultPropertiesInput';
import { trackUserAction } from 'lib/metrics/mixpanel/trackUserAction';
import { updateTrackGroupProfile } from 'lib/metrics/mixpanel/updateTrackGroupProfile';
import { updateTrackUserProfileById } from 'lib/metrics/mixpanel/updateTrackUserProfileById';
import { logSpaceCreation } from 'lib/metrics/postToDiscord';
import { onError, onNoMatch, requireUser } from 'lib/middleware';
import { convertJsonPagesToPrisma } from 'lib/pages/server/convertJsonPagesToPrisma';
import { createPage } from 'lib/pages/server/createPage';
import { setupDefaultPaymentMethods } from 'lib/payment-methods/defaultPaymentMethods';
import { updateSpacePermissionConfigurationMode } from 'lib/permissions/meta';
import { generateDefaultCategoriesInput } from 'lib/proposal/generateDefaultCategoriesInput';
import { withSessionRoute } from 'lib/session/withSession';

const handler = nc<NextApiRequest, NextApiResponse>({ onError, onNoMatch });

handler.use(requireUser).get(getSpaces).post(createSpace);

async function getSpaces (req: NextApiRequest, res: NextApiResponse<Space[]>) {
  const userId = req.session.user.id;

  const spaceRoles = await prisma.spaceRole.findMany({
    where: {
      userId
    },
    include: {
      space: true
    }
  });
  const spaces = spaceRoles.map(sr => sr.space);
  return res.status(200).json(spaces);
}

async function createSpace (req: NextApiRequest, res: NextApiResponse<Space>) {
  const userId = req.session.user.id;
  const data = req.body as Prisma.SpaceCreateInput;
  // add a first page to the space
  // data.pages = {
  //   create: [{
  //     author: { connect: { id: req.session.user.id } },
  //     autoGenerated: true,
  //     content: gettingStartedPageContent(),
  //     contentText: '',
  //     path: 'getting-started',
  //     title: 'Getting Started',
  //     type: 'page',
  //     updatedAt: new Date(),
  //     updatedBy: data.author.connect!.id!
  //   }]
  // };

  const space = await prisma.space.create({ data, include: { pages: true } });

  // Create all page content in a single transaction
  const sourceDataPath = path.resolve('seedData/space/space-da74cab3-c2b6-40bb-8734-0de5375b0fce-pages-1657887621286');

  const seedPagesTransactionInput = await convertJsonPagesToPrisma({
    folderPath: sourceDataPath,
    spaceId: space.id
  });

  const defaultCategories = generateDefaultCategoriesInput(space.id);
  const defaultProperties = generateDefaultPropertiesInput({ userId, spaceId: space.id });

  await prisma.$transaction([
    ...seedPagesTransactionInput.blocksToCreate.map(input => prisma.block.create({ data: input })),
    ...seedPagesTransactionInput.pagesToCreate.map(input => createPage({ data: input })),
    prisma.proposalCategory.createMany({ data: defaultCategories }),
    prisma.memberProperty.createMany({ data: defaultProperties })
  ]);

  const updatedSpace = await updateSpacePermissionConfigurationMode({
    permissionConfigurationMode: data.permissionConfigurationMode ?? 'collaborative',
    spaceId: space.id
  });

  // Add default stablecoin methods
  await setupDefaultPaymentMethods({ spaceIdOrSpace: space });

  logSpaceCreation(space);
  updateTrackGroupProfile(space);
  updateTrackUserProfileById(userId);
  trackUserAction('create_new_workspace', { userId, spaceId: space.id });

  return res.status(200).json(updatedSpace);
}

export default withSessionRoute(handler);

