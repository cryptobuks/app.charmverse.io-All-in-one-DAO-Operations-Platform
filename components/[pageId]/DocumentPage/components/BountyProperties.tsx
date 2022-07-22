import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { FormLabel, IconButton, Stack, TextField } from '@mui/material';
import { PaymentMethod } from '@prisma/client';
import charmClient from 'charmClient';
import { BountyStatusChip } from 'components/bounties/components/BountyStatusBadge';
import Switch from 'components/common/BoardEditor/focalboard/src/widgets/switch';
import InputSearchBlockchain from 'components/common/form/InputSearchBlockchain';
import { InputSearchContributorMultiple } from 'components/common/form/InputSearchContributor';
import InputSearchContributorsRoles from 'components/common/form/InputSearchContributorsRoles';
import { InputSearchCrypto } from 'components/common/form/InputSearchCrypto';
import { InputSearchRoleMultiple } from 'components/common/form/InputSearchRole';
import SelectMenu, { MenuOption } from 'components/common/Menu';
import { CryptoCurrency, getChainById } from 'connectors';
import { useBounties } from 'hooks/useBounties';
import { useCurrentSpace } from 'hooks/useCurrentSpace';
import { usePaymentMethods } from 'hooks/usePaymentMethods';
import { BountyPermissions, BountySubmitter, UpdateableBountyFields } from 'lib/bounties';
import { inferBountyPermissionsMode } from 'lib/bounties/client';
import { TargetPermissionGroup } from 'lib/permissions/interfaces';
import debouncePromise from 'lib/utilities/debouncePromise';
import { isTruthy } from 'lib/utilities/types';
import { BountyWithDetails } from 'models';
import { useCallback, useEffect, useState } from 'react';

const submitterMenuOptions: MenuOption<BountySubmitter>[] = [{
  value: 'space',
  primary: 'Workspace',
  secondary: 'All workspace members can work on this bounty'
}, {
  value: 'role',
  primary: 'Specific roles',
  secondary: 'Only members with specific roles can work on this bounty'
}];

function rollupPermissions ({
  selectedReviewerUsers,
  selectedReviewerRoles,
  submitterMode,
  assignedRoleSubmitters,
  spaceId
}: {
  selectedReviewerUsers: string[],
  selectedReviewerRoles: string[],
  assignedRoleSubmitters: string[],
  submitterMode: 'role' | 'space',
  spaceId: string
}): Pick<BountyPermissions, 'reviewer' | 'submitter'> {
  const reviewers = [
    ...selectedReviewerUsers.map(uid => {
      return {
        id: uid,
        group: 'user'
      } as TargetPermissionGroup;
    }),
    ...selectedReviewerRoles.map(uid => {
      return {
        id: uid,
        group: 'role'
      } as TargetPermissionGroup;
    })
  ];
  const submitters: TargetPermissionGroup[] = submitterMode === 'role' ? assignedRoleSubmitters.map(uid => {
    return {
      group: 'role',
      id: uid
    };
  }) : [{
    id: spaceId,
    group: 'space'
  }];

  const permissionsToSend: Pick<BountyPermissions, 'reviewer' | 'submitter'> = {
    reviewer: reviewers,
    submitter: submitters
  };

  return permissionsToSend;
}

export default function BountyProperties (props: {readOnly?: boolean, bounty: BountyWithDetails}) {
  const { bounty, readOnly = false } = props;
  const [paymentMethods] = usePaymentMethods();
  const { updateBounty } = useBounties();
  const [availableCryptos, setAvailableCryptos] = useState<Array<string | CryptoCurrency>>([]);
  const [isShowingAdvancedSettings, setIsShowingAdvancedSettings] = useState(false);
  const [currentBounty, setCurrentBounty] = useState<BountyWithDetails>(bounty);
  const [capSubmissions, setCapSubmissions] = useState(false);
  const [space] = useCurrentSpace();
  const [bountyPermissions, setBountyPermissions] = useState<BountyPermissions | null>(null);
  const [submitterMode, setSubmitterMode] = useState<BountySubmitter>(bountyPermissions ? inferBountyPermissionsMode(bountyPermissions).mode : 'space');
  const assignedRoleSubmitters = bountyPermissions?.submitter?.filter(p => p.group === 'role').map(p => p.id as string) ?? [];
  const selectedReviewerUsers = bountyPermissions?.reviewer?.filter(p => p.group === 'user').map(p => p.id as string) ?? [];
  const selectedReviewerRoles = bountyPermissions?.reviewer?.filter(p => p.group === 'role').map(p => p.id as string) ?? [];

  async function refreshBountyPermissions (bountyId: string) {
    setBountyPermissions(null);
    charmClient.computeBountyPermissions({
      resourceId: bountyId
    }).then(data => setBountyPermissions(data.bountyPermissions));
  }

  function refreshCryptoList (chainId: number, rewardToken?: string) {

    // Set the default chain currency
    const selectedChain = getChainById(chainId);

    if (selectedChain) {

      const nativeCurrency = selectedChain.nativeCurrency.symbol;

      const cryptosToDisplay = [nativeCurrency];

      const contractAddresses = paymentMethods
        .filter(method => method.chainId === chainId)
        .map(method => {
          return method.contractAddress;
        })
        .filter(isTruthy);
      cryptosToDisplay.push(...contractAddresses);

      setAvailableCryptos(cryptosToDisplay);
      setCurrentBounty((_currentBounty) => ({ ..._currentBounty, rewardToken: rewardToken || nativeCurrency }));
    }
  }

  function onNewPaymentMethod (paymentMethod: PaymentMethod) {
    if (paymentMethod.contractAddress) {
      setCurrentBounty((_currentBounty) => ({ ..._currentBounty, chainId: paymentMethod.chainId }));
      refreshCryptoList(paymentMethod.chainId, paymentMethod.contractAddress);
    }
  }

  async function refreshBountyApplicantPool (): Promise<void> {
    if (bountyPermissions) {
      const calculation = await charmClient.getBountyApplicantPool({
        permissions: rollupPermissions({
          assignedRoleSubmitters,
          selectedReviewerRoles,
          selectedReviewerUsers,
          spaceId: space!.id,
          submitterMode
        })
      });

      if (calculation.mode === 'space') {
        setSubmitterMode('space');
      }

      if (calculation.mode === 'role') {
        setSubmitterMode('role');
      }
    }
  }

  const debouncedBountyUpdate = debouncePromise(async (bountyId, updates: Partial<UpdateableBountyFields>) => {
    updateBounty(bountyId, updates);
  }, 2500);

  const updateBountyAmount = useCallback((e) => {
    setCurrentBounty((_currentBounty) => ({ ..._currentBounty,
      rewardAmount: Number(e.target.value)
    }));
    debouncedBountyUpdate(currentBounty.id, {
      rewardAmount: Number(e.target.value)
    });
  }, []);

  const updateBountyMaxSubmissions = useCallback((e) => {
    setCurrentBounty((_currentBounty) => ({ ..._currentBounty,
      maxSubmissions: Number(e.target.value)
    }));
    debouncedBountyUpdate(currentBounty.id, {
      maxSubmissions: Number(e.target.value)
    });
  }, []);

  useEffect(() => {
    refreshBountyApplicantPool();
  }, [submitterMode, bountyPermissions]);

  useEffect(() => {
    refreshCryptoList(bounty.chainId, bounty.rewardToken);
    refreshBountyPermissions(currentBounty.id);
  }, []);

  return (
    <div className='octo-propertylist CardDetailProperties'>
      <div className='octo-propertyrow'>
        <div className='octo-propertyname'>Status</div>
        <BountyStatusChip
          size='small'
          status={currentBounty.status}
        />
      </div>
      <div className='octo-propertyrow'>
        <div className='octo-propertyname'>Reviewer</div>
        <InputSearchContributorsRoles
          defaultValue={selectedReviewerRoles}
          disableCloseOnSelect={true}
          onChange={async (e, roles) => {
            await updateBounty(currentBounty.id, {
              permissions: rollupPermissions({
                assignedRoleSubmitters,
                selectedReviewerRoles: (roles as any[]).map(role => role.id),
                selectedReviewerUsers,
                spaceId: space!.id,
                submitterMode
              })
            });
            refreshBountyPermissions(currentBounty.id);
          }}
          excludedIds={selectedReviewerRoles}
          sx={{
            width: 250
          }}
        />
      </div>

      <div className='octo-propertyrow'>
        <div className='octo-propertyname'>Chain</div>
        <InputSearchBlockchain
          chainId={currentBounty.chainId}
          sx={{
            width: 250
          }}
          onChange={(chainId) => {
            setCurrentBounty((_currentBounty) => ({ ..._currentBounty, chainId }));
            updateBounty(currentBounty.id, {
              chainId
            });
          }}
        />
      </div>

      <div className='octo-propertyrow'>
        <div className='octo-propertyname'>Token</div>
        <InputSearchCrypto
          cryptoList={availableCryptos}
          chainId={currentBounty?.chainId}
          defaultValue={currentBounty?.rewardToken}
          value={currentBounty.rewardToken}
          hideBackdrop={true}
          onChange={newToken => {
            setCurrentBounty((_currentBounty) => ({ ..._currentBounty, rewardToken: newToken }));
            updateBounty(currentBounty.id, {
              rewardToken: newToken
            });
          }}
          onNewPaymentMethod={onNewPaymentMethod}
          sx={{
            width: 250
          }}
        />
      </div>

      <div className='octo-propertyrow'>
        <div className='octo-propertyname'>Amount</div>
        <TextField
          required
          sx={{
            width: 250
          }}
          value={currentBounty.rewardAmount}
          type='number'
          size='small'
          onChange={updateBountyAmount}
          inputProps={{
            step: 0.000000001
          }}
        />
      </div>
      <Stack gap={0.5} flexDirection='row' mt={2}>
        <FormLabel sx={{
          fontWeight: 500
        }}
        >Advanced Settings
        </FormLabel>
        <IconButton
          size='small'
          onClick={() => {
            setIsShowingAdvancedSettings(!isShowingAdvancedSettings);
          }}
          sx={{
            top: -2.5,
            position: 'relative'
          }}
        >
          {isShowingAdvancedSettings ? <KeyboardArrowUpIcon fontSize='small' /> : <KeyboardArrowDownIcon fontSize='small' />}
        </IconButton>
      </Stack>
      {isShowingAdvancedSettings && (
      <>
        <div className='octo-propertyrow'>
          <div className='octo-propertyname'>Require applications</div>
          <Switch
            isOn={Boolean(currentBounty.approveSubmitters)}
            onChanged={(isOn) => {
              setCurrentBounty((_currentBounty) => ({ ..._currentBounty, approveSubmitters: isOn }));
              updateBounty(currentBounty.id, {
                approveSubmitters: isOn
              });
            }}
            readOnly={readOnly}
          />
        </div>
        <div className='octo-propertyrow'>
          <div className='octo-propertyname'>Applicant Criteria</div>
          <SelectMenu
            selectedValue={submitterMode}
            valueUpdated={(value) => setSubmitterMode(value as BountySubmitter)}
            options={submitterMenuOptions}
          />
        </div>
        { submitterMode === 'role' && (
        <div className='octo-propertyrow'>
          <div className='octo-propertyname'>Applicant Role(s)</div>
          <InputSearchRoleMultiple
            disableCloseOnSelect={true}
            defaultValue={assignedRoleSubmitters}
            onChange={async (roleIds) => {
              await updateBounty(currentBounty.id, {
                permissions: rollupPermissions({
                  assignedRoleSubmitters: roleIds,
                  selectedReviewerRoles,
                  selectedReviewerUsers,
                  spaceId: space!.id,
                  submitterMode
                })
              });
              refreshBountyPermissions(currentBounty.id);
            }}
            filter={{ mode: 'exclude', userIds: assignedRoleSubmitters }}
            showWarningOnNoRoles={true}
          />
        </div>
        )}
        <div className='octo-propertyrow'>
          <div className='octo-propertyname'>Submissions limit</div>
          <Switch
            isOn={capSubmissions}
            onChanged={(isOn) => {
              setCapSubmissions(isOn);
              setCurrentBounty((_currentBounty) => ({ ..._currentBounty, maxSubmissions: isOn ? 1 : _currentBounty.maxSubmissions }));
              updateBounty(currentBounty.id, {
                maxSubmissions: isOn ? 1 : currentBounty.maxSubmissions
              });
            }}
            readOnly={readOnly}
          />
        </div>
        {capSubmissions && (
        <div className='octo-propertyrow'>
          <div className='octo-propertyname'>Max submissions</div>
          <TextField
            required
            value={currentBounty.maxSubmissions}
            type='number'
            size='small'
            inputProps={{ step: 1, min: 1 }}
            sx={{
              width: 250
            }}
            onChange={updateBountyMaxSubmissions}
          />
        </div>
        )}
      </>
      )}

    </div>
  );
}
