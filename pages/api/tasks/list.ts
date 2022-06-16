import { onError, onNoMatch, requireUser } from 'lib/middleware';
import { withSessionRoute } from 'lib/session/withSession';
import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import { getPendingGnosisTasks, GnosisSafeTasks } from 'lib/gnosis/gnosis.tasks';
import { getMentionedTasks, MentionedTasksGroup } from 'lib/mentions/getMentionedTasks';

const handler = nc<NextApiRequest, NextApiResponse>({ onError, onNoMatch });

handler.use(requireUser).get(getTasks);

export interface GetTasksResponse {
  gnosis: GnosisSafeTasks[];
  mentioned: MentionedTasksGroup
}

async function getTasks (req: NextApiRequest, res: NextApiResponse<GetTasksResponse>) {
  const gnosisTasks = await getPendingGnosisTasks(req.session.user.id);
  const mentionedTasksGroup = await getMentionedTasks(req.session.user.id);
  return res.status(200).json({ gnosis: gnosisTasks, mentioned: mentionedTasksGroup });
}

export default withSessionRoute(handler);
