// Compare the same two captured test designs against both R15 image workers.
// Pass the two release roots as arguments and the two private image pairs on stdin.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [oldRoot, newRoot] = process.argv.slice(2);
assert(oldRoot && newRoot && oldRoot !== newRoot);
const moduleAt = root => pathToFileURL(path.resolve(root, 'app/workshop/customer-photo.mjs'));
const old = await import(moduleAt(oldRoot));
const current = await import(moduleAt(newRoot));
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const pairs = JSON.parse(Buffer.concat(chunks).toString());
assert.equal(pairs.length, 2);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const runs = [];
for (let round = 0; round < 6; round++) {
  for (const [i, {customer, reference}] of pairs.entries()) {
    assert(customer.length <= 512*1024 && reference.length <= 256*1024);
    const times = {};
    let hashes;
    for (const version of (round+i)%2===0 ? ['before','after'] : ['after','before']) {
      const begin = performance.now();
      const result = version === 'before'
        ? {customer:await old.prepareCustomerPhoto(customer),reference:await old.prepareCustomerPhoto(reference)}
        : await current.prepareReviewPreviewPair(customer,reference);
      times[version]=Math.round((performance.now()-begin)*100)/100;
      const both = [result.customer,result.reference].map(image =>
        [image.width,image.height,sha(image.preview),sha(image.original)]);
      if (hashes) assert.deepEqual(both,hashes);
      hashes=both;
    }
    runs.push({round:round+1,position:i+1,...times,matchingOutput:true});
  }
}
console.log(JSON.stringify({unit:'ms',pairs:pairs.length,runs}));
