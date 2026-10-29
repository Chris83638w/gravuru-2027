// Independent render/encoding work; saving the immutable offer still follows all of it.
export async function prepareCartImages({artwork,media,reference,customer}){
 const artJob=artwork();
 const [art,encoded,customerPreview,preview]=await Promise.all([artJob,media(),customer(),artJob.then(reference)]);
 return {art,media:encoded,preview,customerPreview};
}
