
import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import { onError, onNoMatch, requireKeys, requireUser } from 'lib/middleware';
import { withSessionRoute } from 'lib/session/withSession';
import { requirePagePermissions } from 'lib/middleware/requirePagePermissions';
import { Page, PagePermissionLevel } from '@prisma/client';
import { prisma } from 'db';
import { computeUserPagePermissions } from 'lib/permissions/pages/page-permission-compute';
import { PageOperationType } from 'lib/permissions/pages/page-permission-interfaces';

const handler = nc<NextApiRequest, NextApiResponse>({ onError, onNoMatch });

handler.use(requireUser)
  .use(requireKeys(['id'], 'query'))
  .use(requireUser)
  .put(updatePage)
  .delete(requirePagePermissions(['delete'], deletePage));

async function updatePage (req: NextApiRequest, res: NextApiResponse) {

  const pageId = req.query.id as string;
  const userId = req.session.user.id;

  const permissions = await computeUserPagePermissions({
    pageId,
    userId
  });

  const updateContent = req.body as Page;

  // eslint-disable-next-line eqeqeq
  if (updateContent.isPublic != undefined && permissions.edit_isPublic !== true) {
    return res.status(401).json({
      error: 'You cannot update the public status of this page'
    });

  }
  else if (permissions.edit_content !== true) {
    return res.status(401).json({
      error: 'You cannot update this page'
    });
  }

  const space = await prisma.page.update({
    where: {
      id: req.query.id as string
    },
    data: req.body,
    include: {
      permissions: true
    }
  });
  return res.status(200).json(space);
}

async function deletePage (req: NextApiRequest, res: NextApiResponse) {
  const userId = req.session.user.id;
  const rootPage = await prisma.page.findUnique({
    where: {
      id: req.query.id as string
    }
  });

  const pagesToDelete: string[] = [];

  let currentDeletedPages: string[] = rootPage?.id ? [
    rootPage.id
  ] : [];

  while (currentDeletedPages.length !== 0) {
    const newPagesToDelete: string[] = [];
    for (const pageId of currentDeletedPages) {
      const permissionSet = await computeUserPagePermissions({
        pageId,
        userId
      });

      // If the user is allowed to delete this page, go further and to check if we can delete more of its children
      if (permissionSet.delete === true) {
        pagesToDelete.push(pageId);
        const childPages = await prisma.page.findMany({
          where: {
            parentId: pageId
          }
        });

        newPagesToDelete.push(...childPages.map(childPage => childPage.id));
      }
    }
    currentDeletedPages = newPagesToDelete;
  }

  await prisma.page.updateMany({
    where: {
      id: {
        in: pagesToDelete
      }
    },
    data: {
      alive: false,
      deletedAt: new Date()
    }
  });
  return res.status(200).json({ deletedPageIds: pagesToDelete });
}

export default withSessionRoute(handler);
