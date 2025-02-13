import EmailIcon from '@mui/icons-material/Email';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PeopleIcon from '@mui/icons-material/People';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { UserGnosisSafe } from '@prisma/client';
import { DateTime } from 'luxon';
import { Fragment, useState } from 'react';

import Link from 'components/common/Link';
import UserDisplay, { AnonUserDisplay } from 'components/common/UserDisplay';
import type { GnosisTask, GnosisTransactionPopulated } from 'lib/gnosis/gnosis.tasks';
import { getGnosisSafeUrl } from 'lib/gnosis/utils';
import { shortenHex } from 'lib/utilities/strings';

import { EmptyTaskState } from '../components/EmptyTaskState';
import Table from '../components/NexusTable';

function TransactionRow({
  firstNonce,
  isSnoozed,
  transaction,
  showNonce,
  isLastTransaction
}: {
  firstNonce: number;
  isSnoozed: boolean;
  transaction: GnosisTransactionPopulated;
  showNonce: boolean;
  isLastTransaction: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isReadyToExecute = transaction.confirmations?.length === transaction.threshold;
  const isFirstTask = transaction.nonce === firstNonce;

  return (
    <>
      <TableRow
        onClick={() => setExpanded((prevState) => !prevState)}
        role='button'
        aria-pressed={expanded}
        sx={{ ...(!isLastTransaction && { '& > .MuiTableCell-root': { borderBottom: 0 } }) }}
      >
        <TableCell align='center'>
          <strong>{!!showNonce && transaction.nonce}</strong>
        </TableCell>
        <TableCell>
          <Typography>{transaction.description}</Typography>
        </TableCell>
        <TableCell>
          <Typography>{DateTime.fromISO(transaction.date).toRelative({ base: DateTime.now() })}</Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant='caption'
            sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: isReadyToExecute ? 'bold' : '' }}
          >
            <PeopleIcon color='secondary' fontSize='small' /> {transaction.confirmations?.length || 0} out of{' '}
            {transaction.threshold}
          </Typography>
        </TableCell>
        <TableCell>
          <Box gap={1} display='flex' alignItems='center'>
            <Tooltip
              arrow
              placement='top'
              title={
                isSnoozed
                  ? 'Transactions snoozed'
                  : !isFirstTask
                  ? `Transaction with nonce ${firstNonce} needs to be executed first`
                  : ''
              }
            >
              <div>
                <Chip
                  clickable={!!transaction.myAction}
                  component='a'
                  label={transaction.myAction || 'Waiting for others'}
                  href={transaction.myActionUrl}
                  target='_blank'
                  color={transaction.myAction ? 'primary' : undefined}
                  variant={transaction.myAction ? 'filled' : 'outlined'}
                  disabled={isSnoozed || !isFirstTask}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </Tooltip>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow sx={{ '& > .MuiTableCell-root': { borderBottom: 0 } }}>
        <TableCell sx={{ padding: 0 }} colSpan={5}>
          <Collapse in={expanded}>
            <Box py={1} pl={1} sx={{ bgcolor: 'background.light' }}>
              <Grid container spacing={1}>
                <Grid item xs={5}>
                  {transaction.actions.map((action) => (
                    <Box py={1} key={action.to.address}>
                      <Typography gutterBottom>
                        Sending <strong>{action.friendlyValue}</strong> to:
                      </Typography>
                      {action.to.user ? (
                        <UserDisplay
                          sx={{
                            '.MuiTypography-root': {
                              fontSize: {
                                xs: 14,
                                sm: 'inherit'
                              }
                            }
                          }}
                          avatarSize='small'
                          user={action.to.user}
                        />
                      ) : (
                        <AnonUserDisplay
                          avatarSize='small'
                          sx={{
                            '.MuiTypography-root': {
                              fontSize: {
                                xs: 14,
                                sm: 'inherit'
                              }
                            }
                          }}
                          address={shortenHex(action.to.address)}
                        />
                      )}
                    </Box>
                  ))}
                </Grid>
                <Grid item xs={1}>
                  <Divider orientation='vertical' />
                </Grid>
                <Grid item xs={5} pr={1}>
                  <Typography color='secondary' gutterBottom variant='body2'>
                    Confirmations
                  </Typography>
                  {transaction.confirmations.map((confirmation) => (
                    <Box py={1} key={confirmation.address}>
                      {confirmation.user ? (
                        <UserDisplay
                          sx={{
                            '.MuiTypography-root': {
                              fontSize: {
                                xs: 14,
                                sm: 'inherit'
                              }
                            }
                          }}
                          avatarSize='small'
                          user={confirmation.user}
                        />
                      ) : (
                        <AnonUserDisplay
                          sx={{
                            '.MuiTypography-root': {
                              fontSize: {
                                xs: 14,
                                sm: 'inherit'
                              }
                            }
                          }}
                          avatarSize='small'
                          address={shortenHex(confirmation.address)}
                        />
                      )}
                    </Box>
                  ))}
                  {transaction.snoozedUsers.length !== 0 ? (
                    <Typography sx={{ mt: 2 }} color='secondary' gutterBottom variant='body2'>
                      Snoozed
                    </Typography>
                  ) : null}
                  {transaction.snoozedUsers.map((snoozedUser) => (
                    <Box key={snoozedUser.id} py={1} display='flex' justifyContent='space-between'>
                      <UserDisplay avatarSize='small' user={snoozedUser} />
                      <Box display='flex' gap={1} alignItems='center'>
                        {snoozedUser.notificationState?.snoozeMessage && (
                          <Tooltip arrow placement='top' title={snoozedUser.notificationState.snoozeMessage}>
                            <EmailIcon fontSize='small' color='secondary' />
                          </Tooltip>
                        )}
                        <Typography variant='subtitle1' color='secondary'>
                          for{' '}
                          {DateTime.fromJSDate(new Date(snoozedUser.notificationState?.snoozedUntil as Date))
                            .toRelative({ base: DateTime.now() })
                            ?.slice(3)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function GnosisTasksTable({ tasks, isSnoozed }: { tasks: GnosisTask[]; isSnoozed: boolean }) {
  return (
    <Table size='medium' aria-label='Nexus multisign table'>
      <TableHead>
        <TableRow>
          <TableCell align='center'>Nonse</TableCell>
          <TableCell sx={{ minWidth: { xs: 150, sm: 'inherit' } }}>Payment</TableCell>
          <TableCell sx={{ minWidth: { xs: 130, sm: 'inherit' } }}>Date</TableCell>
          <TableCell sx={{ minWidth: { xs: 130, sm: 'inherit' } }}>Required Signers</TableCell>
          <TableCell width='100'>
            <Typography variant='body2' fontWeight='500' marginLeft='12px' variantMapping={{ body2: 'span' }}>
              Action
            </Typography>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {tasks.map((task: GnosisTask) => (
          <Fragment key={task.nonce}>
            {task.transactions.length > 1 && (
              <TableRow sx={{ '& > .MuiTableCell-root': { borderBottom: 0 } }}>
                <TableCell align='center'>
                  <Typography fontWeight='bold'>{task.transactions[0].nonce}</Typography>
                </TableCell>
                <TableCell colSpan={4}>
                  <Alert color='info' icon={false} sx={{ py: 0, width: '100%', fontSize: { sm: '14px', xs: '12px' } }}>
                    These transactions conflict as they use the same nonce. Executing one will automatically replace the
                    other(s).
                  </Alert>
                </TableCell>
              </TableRow>
            )}
            {task.transactions.map((transaction, index, arr) => (
              <TransactionRow
                key={transaction.id}
                isLastTransaction={arr.length - 1 === index}
                showNonce={index === 0 && task.transactions.length === 1}
                firstNonce={tasks[0].transactions[0].nonce}
                isSnoozed={isSnoozed}
                transaction={transaction}
              />
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

export function SafeTasks({
  isSnoozed,
  safe,
  tasks
}: {
  isSnoozed: boolean;
  safe: UserGnosisSafe;
  tasks: GnosisTask[];
}) {
  return (
    <Box margin='40px 0'>
      <Typography variant='body2' color='inherit' display='flex' alignItems='center' gap={1} marginBottom='20px'>
        <strong>Gnosis Safe:</strong>
        <Link
          href={getGnosisSafeUrl(safe.address, safe.chainId)}
          external
          target='_blank'
          display='inline-flex'
          alignItems='center'
          gap={0.5}
        >
          {safe.name || shortenHex(safe.address)} <OpenInNewIcon fontSize='small' />
        </Link>
      </Typography>
      <Box overflow='auto'>
        {tasks.length === 0 ? (
          <EmptyTaskState key={safe.address} taskType='transactions' />
        ) : (
          <GnosisTasksTable tasks={tasks} isSnoozed={isSnoozed} />
        )}
      </Box>
    </Box>
  );
}
