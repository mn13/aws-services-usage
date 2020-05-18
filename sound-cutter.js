const AWS = require('aws-sdk');
const util = require('util');

const elastictranscoder = new AWS.ElasticTranscoder({
  accessKeyId: process.env.AWS_TRANSCODE_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_TRANSCODE_SECRET_ACCESS_KEY,
  region: process.env.AWS_TRANSCODE_REGION,
});

module.exports = async function soundCutter(sourceUrl, start, finish) {
  const createJob = util.promisify(elastictranscoder.createJob).bind(elastictranscoder);
  const waitFor = util.promisify(elastictranscoder.waitFor).bind(elastictranscoder);

  const srcKey = (new URL(sourceUrl)).pathname.slice(1);
  const srcName = srcKey.split('/').pop();
  const dstKey = `Sound/${srcName.split('.').slice(0, -1).join('.')}${start}${finish}.mp3`;

  const { Job } = await createJob({
    PipelineId: process.env.AWS_PIPE_LINE_ID,
    Input: {
      AspectRatio: 'auto',
      Container: 'auto',
      FrameRate: 'auto',
      Interlaced: 'auto',
      Key: srcKey,
      Resolution: 'auto',
      TimeSpan: {
        StartTime: start, // starting place of the clip, in HH:mm:ss.SSS or sssss.SSS
        Duration: `${Number(finish) - Number(start)}`, // duration of the clip, in HH:mm:ss.SSS or sssss.SSS
      },
    },
    Output: {
      Key: dstKey,
      PresetId: process.env.AWS_PRESET_ID,
    },
  });

  const result = await waitFor('jobComplete', { Id: Job.Id });
  
  if (result.Job.Status === 'Error') {
    throw new Error(`Elastic transcoder job error: ${result.Job}`);
  }

  const resultUrl = new URL(sourceUrl);
  resultUrl.pathname = dstKey;

  return resultUrl.href;
}
