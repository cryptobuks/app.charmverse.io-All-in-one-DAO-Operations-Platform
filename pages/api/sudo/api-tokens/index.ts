
import { prisma } from 'db';
import { onError, onNoMatch, requireKeys, getBotUser } from 'lib/middleware';
import { withSessionRoute } from 'lib/session/withSession';
import { NextApiRequest, NextApiResponse } from 'next';
import nc, { NextHandler } from 'next-connect';
import crypto from 'node:crypto';

function requireSudoKey (req: NextApiRequest, res: NextApiResponse, next: NextHandler) {
  const { sudoApiKey } = req.query;

  const currentSudoKey = process.env.SUDO_API_KEY;

  if (!currentSudoKey || !sudoApiKey || currentSudoKey.trim() !== (sudoApiKey as string).trim()) {
    return res.status(401).send({
      error: 'Please provide a valid API Key'
    });
  }

  next();

}

const handler = nc<NextApiRequest, NextApiResponse>({ onError, onNoMatch });

handler
  .use(requireSudoKey)
  .use(requireKeys(['spaceId'], 'body'))
  .post(provisionToken)
  .delete(invalidateToken);

async function provisionToken (req: NextApiRequest, res: NextApiResponse) {

  const { spaceId } = req.body;

  const newApiKey = crypto.randomBytes(160 / 8).toString('hex');

  const spaceToken = await prisma.spaceApiToken.upsert({
    where: {
      spaceId: spaceId as string
    },
    update: {
      token: newApiKey,
      updatedAt: new Date().toISOString()
    },
    create: {
      token: newApiKey,
      space: {
        connect: {
          id: spaceId
        }
      }
    }
  });

  await getBotUser(spaceId);

  return res.status(200).json(spaceToken);

}

async function invalidateToken (req: NextApiRequest, res: NextApiResponse) {
  const { spaceId } = req.body;
  await prisma.spaceApiToken.delete({
    where: {
      spaceId: spaceId as string
    }
  });

  return res.status(200).send({
    success: true
  });

}

export default handler;