import { BlobStorageError } from '@riposte/core'
import type {
  DisputeEvidenceArtifactBlob,
  IDisputeEvidenceArtifactBlobRepository,
  SaveDisputeEvidenceArtifactBlobInput,
} from '@server/domain/repository/interfaces'
import { RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'

export class DisputeEvidenceArtifactBlobRepository
  implements IDisputeEvidenceArtifactBlobRepository
{
  constructor(private readonly bucket: R2Bucket) {}

  async save(
    input: SaveDisputeEvidenceArtifactBlobInput,
  ): Promise<Result<DisputeEvidenceArtifactBlob, BlobStorageError>> {
    const saved = await Result.tryPromise(
      {
        try: async () =>
          this.bucket.put(input.r2Key, input.bytes, {
            httpMetadata: {
              contentType: input.contentType,
            },
        }),
        catch: (cause) =>
          new BlobStorageError({
            message: `Failed to save evidence artifact blob ${input.r2Key}`,
            cause,
          }),
      },
      RETRY.transient,
    )

    return saved.map((object) => ({
      r2Key: object.key,
      contentType: input.contentType,
      byteSize: input.bytes.byteLength,
      etag: object.etag,
    }))
  }
}
