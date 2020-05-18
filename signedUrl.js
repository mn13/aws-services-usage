const AWS = require('aws-sdk');
const util = require('util');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
});

module.exports = async (key) => {
  const getSignedUrl = util.promisify(s3.getSignedUrl).bind(s3);

  const getUrl = `${process.env.AWS_S3_HOST}/${key}`;
  const putUrl = await getSignedUrl('putObject', {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  return { getUrl, putUrl }
}
