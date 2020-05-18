const util = require('util')
const AWS = require('aws-sdk')

const translate = new AWS.Translate({
  accessKeyId: process.env.AWS_TRANSLATE_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_TRANSLATE_SECRET_ACCESS_KEY,
  region: process.env.AWS_TRANSLATE_REGION,
})


module.exports = async (text, from, to) => {
  const translateText = util.promisify(translate.translateText).bind(translate)

  const data = await translateText({
    SourceLanguageCode: from,
    TargetLanguageCode: to,
    Text: text,
  })

  return data.TranslatedText
}
