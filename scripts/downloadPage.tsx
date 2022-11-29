
import { prisma } from 'db';
const pageUrl = 'page-8757316176203402';
import { writeFileSync } from 'fs';
async function download () {
  const page = await prisma.page.findMany({
    where: {
      path: pageUrl
    },
    include: {
      diffs: true
    }
  });

  writeFileSync(`page-download.json`, JSON.stringify(page, null, 2));
  console.log('done', page.length)
}

download();