import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import Sharp from "sharp";

const PathPattern = /(.+?)_(w|h)([1-9][0-9]+)\.(webp|jpg)$/; // e.g  xxxx/cover.jpg_w100.webp

// parameters
const { BUCKET, ENDPOINT } = process.env;
const WHITELIST = process.env.WHITELIST
  ? Object.freeze(process.env.WHITELIST.split(" "))
  : null;

const s3Client = new S3Client();

export const handler = async (event) => {
  const path = event.queryStringParameters?.path;
  if (!path) {
    return errorResponse('Parameter "?path=" is empty or missing');
  }

  if (!PathPattern.test(path)) {
    return errorResponse(
      'Parameter "?path=" should look like: xxx/xxx.jpg_w100.webp'
    );
  }

  const parts = PathPattern.exec(path); // ['images/cover.jpg_w100.webp', 'images/cover.jpg', 'w', '100', 'webp']

  const filepath = parts[1];
  const dimension = parts[2];
  const size = parts[3];
  const format = parts[4];

  const resizeOption = dimension + size;

  // Whitelist validation.
  if (WHITELIST && !WHITELIST.includes(resizeOption)) {
    return errorResponse(
      `WHITELIST is set but does not contain the size parameter "${resizeOption}"`,
      403
    );
  }

  try {
    const originImage = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: filepath,
      })
    );

    const width = dimension === "w" ? parseInt(size) : null;
    const height = dimension === "h" ? parseInt(size) : null;

    let fit = "inside";

    let sharp = Sharp({ failOn: "none" })
      .resize(width, height, { withoutEnlargement: true, fit })
      .rotate();

    switch (format) {
      case "webp":
        sharp = sharp.webp({ quality: 100 });
        break;
      case "jpeg":
        sharp = sharp.jpeg({ quality: 100 });
        break;
    }

    // This does not work: await s3Client.send(new PutObjectCommand({params})
    // Solution: https://github.com/aws/aws-sdk-js-v3/issues/1920#issuecomment-761298908
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET,
        Key: path,
        Body: originImage.Body.pipe(sharp),
        ContentType: `image/${format}`,
        // CacheControl: "public, max-age=86400",
        Tagging: "category=image-resize",
      },
    });
    await upload.done();

    return {
      statusCode: 301,
      headers: { Location: `${ENDPOINT}/${path}` },
    };
  } catch (e) {
    return errorResponse("Exception: " + e.message, e.statusCode || 400);
  }
};

function errorResponse(body, statusCode = 400) {
  return {
    statusCode,
    body,
    headers: { "Content-Type": "text/plain" },
  };
}
