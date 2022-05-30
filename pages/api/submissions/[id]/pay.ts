
import { Application } from '@prisma/client';
import { prisma } from 'db';
import { paySubmission } from 'lib/applications/actions/paySubmission';
import { rollupBountyStatus } from 'lib/bounties/rollupBountyStatus';
import { hasAccessToSpace, onError, onNoMatch, requireUser } from 'lib/middleware';
import { withSessionRoute } from 'lib/session/withSession';
import { DataNotFoundError, UnauthorisedActionError } from 'lib/utilities/errors';
import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';

const handler = nc<NextApiRequest, NextApiResponse>({ onError, onNoMatch });

handler
  .use(requireUser)
  .post(paySubmissionController);

async function paySubmissionController (req: NextApiRequest, res: NextApiResponse<Application>) {
  const { id: submissionId } = req.query;

  const userId = req.session.user.id;

  const submission = await prisma.application.findUnique({
    where: {
      id: submissionId as string
    },
    select: {
      bounty: true
    }
  });

  if (!submission) {
    throw new DataNotFoundError(`Submission with id ${submissionId} not found`);
  }

  const { error, isAdmin } = await hasAccessToSpace({
    spaceId: submission.bounty.spaceId,
    userId,
    adminOnly: false
  });

  if (error) {
    throw error;
  }

  const canReview = isAdmin || submission.bounty.reviewer === userId;

  if (!canReview) {
    throw new UnauthorisedActionError('You cannot review submissions for this bounty');
  }

  const updatedSubmission = await paySubmission(submissionId as string);

  rollupBountyStatus(updatedSubmission.bountyId);

  return res.status(200).json(updatedSubmission);
}

export default withSessionRoute(handler);