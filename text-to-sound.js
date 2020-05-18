const util = require('util');
const AWS = require('aws-sdk');
const uuid = require('uuid/v4');

const polly = new AWS.Polly({
  accessKeyId: process.env.AWS_POLLY_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_POLLY_SECRET_ACCESS_KEY,
  region: process.env.AWS_POLLY_REGION,
});


const getVoiceParams = async (LanguageCode) => {
  const describeVocies = util.promisify(polly.describeVoices).bind(polly);

  const data = await describeVocies({ LanguageCode });
  return {
    VoiceId: data.Voices[0].Id,
    Engine: data.Voices[0].SupportedEngines.find((e) => e === 'neural') || 'standard',
  };
}

const waitForSynthesisResult = async (task) => {
  const getSpeechSynthesisTask = util.promisify(polly.getSpeechSynthesisTask).bind(polly);

  if (task.SynthesisTask.TaskStatus === 'failed') {
    throw new Error(`Synthesis task error: ${task}`);
  }
  if (task.SynthesisTask.TaskStatus === 'completed') {
    return task;
  }
  const {TaskId} = task.SynthesisTask;
  const nextTask = await getSpeechSynthesisTask({ TaskId });

  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve(await waitForSynthesisResult(nextTask));
      } catch (e) {
        reject(e);
      }
    }, 30000);
  });
}

module.exports = async (text, LanguageCode) => {
  const startSpeechSynthesisTask = util.promisify(polly.startSpeechSynthesisTask).bind(polly);

  const { VoiceId, Engine } = await getVoiceParams(LanguageCode);
  const task = await startSpeechSynthesisTask({
    OutputFormat: 'mp3', /* required */
    OutputS3BucketName: process.env.AWS_S3_BUCKET_NAME, /* required */
    Text: text, /* required */
    VoiceId,
    Engine,
    LanguageCode,
    OutputS3KeyPrefix: `Sound/${uuid()}`,
    TextType: 'text',
  });
  const data = await waitForSynthesisResult(task);

  return data.SynthesisTask.OutputUri;
}
