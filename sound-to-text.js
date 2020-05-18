const util = require('util');
const AWS = require('aws-sdk');
const uuid = require('uuid/v4');
const axios = require('axios').default;

const transcribe = new AWS.TranscribeService({
  accessKeyId: process.env.AWS_TRANSCRIBE_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_TRANSCRIBE_SECRET_ACCESS_KEY,
  region: process.env.AWS_TRANSCRIBE_REGION,
});

const waitForTranscriptionResult = async (job) => {
  const getTranscriptionJob = util.promisify(transcribe.getTranscriptionJob).bind(transcribe);

  if (job.TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
    throw new Error(`Transcription job error: ${job}`);
  }
  if (job.TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
    return job;
  }
  const jobName = job.TranscriptionJob.TranscriptionJobName;
  const nextJob = await getTranscriptionJob({ TranscriptionJobName: jobName });

  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve(await waitForTranscriptionResult(nextJob));
      } catch (e) {
        reject(e);
      }
    }, 30000);
  });
}

module.exports = async (MediaFileUri, language) => {
  const startTranscriptionJob = util.promisify(transcribe.startTranscriptionJob).bind(transcribe);
  
  const jobName = `${uuid()}${language}${MediaFileUri.split('/').pop()}`;
  const format = MediaFileUri.split('.').pop();
  const job = await startTranscriptionJob({
    LanguageCode: language,
    Media: { MediaFileUri },
    MediaFormat: format,
    TranscriptionJobName: jobName,
  });
  const { TranscriptionJob } = await waitForTranscriptionResult(job);
  const { data } = await axios.get(TranscriptionJob.Transcript.TranscriptFileUri);

  return data.results.transcripts.map((item) => item.transcript).join(' ');
}
