
import { ethers } from 'ethers';

import { getGnosisService } from 'lib/gnosis';
import { RPC } from 'connectors';

const providerUrl = `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`;

const safeAddress = '0xC6cA85d086FE9e4a93Bbc486466829b9c902bc63';

export async function main () {

  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const signer = provider.getSigner(0);
  const service = getGnosisService({
    chainId: RPC.HARMONY.chainId,
    signer
  });
  const result = await service?.getSafeInfo(safeAddress);

  // const gnosisSafeStates = await prisma.userGnosisSafeState.findMany();
  // await prisma.$transaction(gnosisSafeStates.map(gnosisSafeState => prisma.notificationState.create({
  //   data: {
  //     snoozedUntil: gnosisSafeState.snoozedUntil,
  //     snoozeMessage: gnosisSafeState.snoozeMessage,
  //     user: {
  //       connect: {
  //         id: gnosisSafeState.userId
  //       }
  //     }
  //   }
  // })));
}

main();
