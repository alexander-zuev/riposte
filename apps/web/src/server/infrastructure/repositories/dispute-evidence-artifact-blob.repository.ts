import { BlobStorageError } from '@riposte/core'
import type {
  DisputeEvidenceArtifactBlob,
  DisputeEvidenceArtifactBlobBody,
  IDisputeEvidenceArtifactBlobRepository,
  SaveDisputeEvidenceArtifactBlobInput,
} from '@server/domain/repository/interfaces'
import { RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'

export class DisputeEvidenceArtifactBlobRepository implements IDisputeEvidenceArtifactBlobRepository {
  constructor(private readonly bucket: R2Bucket) {}

  async get(input: {
    r2Key: string
  }): Promise<Result<DisputeEvidenceArtifactBlobBody | null, BlobStorageError>> {
    const found = await Result.tryPromise(
      {
        try: async () => this.bucket.get(input.r2Key),
        catch: (cause) =>
          new BlobStorageError({
            message: `Failed to load evidence artifact blob ${input.r2Key}`,
            cause,
          }),
      },
      RETRY.transient,
    )

    if (found.isErr()) return Result.err(found.error)
    if (!found.value) return Result.ok(null)

    const bytes = new Uint8Array(await found.value.arrayBuffer())

    return Result.ok({
      r2Key: found.value.key,
      contentType: found.value.httpMetadata?.contentType ?? 'application/octet-stream',
      byteSize: bytes.byteLength,
      etag: found.value.etag,
      bytes,
    })
  }

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
