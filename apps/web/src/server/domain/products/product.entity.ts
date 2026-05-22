import {
  type ServiceStartRule,
  ValidationError,
  createEvent,
  createProductInputSchema,
  updateProductInputSchema,
} from '@riposte/core'
import type {
  CreateProductInput,
  ProductStatus,
  ProductType,
  UUIDv4,
  UpdateProductInput,
} from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import { Result } from 'better-result'

export type ProductSnapshot = {
  id: UUIDv4
  userId: UUIDv4
  productName: string
  url: string
  productType: ProductType
  productDescription: string | null
  serviceStartRule: ServiceStartRule | null
  refundPolicyDisclosure: string | null
  cancellationPolicyDisclosure: string | null
  status: ProductStatus
  createdAt: Date
  updatedAt: Date
}

export type ProductEvidenceSetupSnapshot = Pick<
  ProductSnapshot,
  | 'productDescription'
  | 'serviceStartRule'
  | 'refundPolicyDisclosure'
  | 'cancellationPolicyDisclosure'
>

export class Product extends Entity<ProductSnapshot> {
  private constructor(
    readonly id: UUIDv4,
    readonly userId: UUIDv4,
    public productName: string,
    public url: string,
    public productType: ProductType,
    public productDescription: string | null,
    public serviceStartRule: ServiceStartRule | null,
    public refundPolicyDisclosure: string | null,
    public cancellationPolicyDisclosure: string | null,
    private status: ProductStatus,
    readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    super()
  }

  static create(
    input: CreateProductInput,
    now: Date = new Date(),
  ): Result<Product, ValidationError> {
    const parsed = createProductInputSchema.safeParse(input)
    if (!parsed.success) {
      return Result.err(
        new ValidationError({
          issues: parsed.error.issues.map((issue) => ({
            code: issue.code,
            path: issue.path.map(String),
            message: issue.message,
          })),
        }),
      )
    }

    const product = new Product(
      crypto.randomUUID() as UUIDv4,
      parsed.data.userId,
      parsed.data.productName,
      parsed.data.url,
      parsed.data.productType,
      null,
      null,
      null,
      null,
      'setup_pending',
      now,
      now,
    )

    product.addEvent(
      createEvent('ProductCreated', {
        productId: product.id,
        userId: product.userId,
        productType: product.productType,
      }),
    )

    return Result.ok(product)
  }

  static deserialize(snapshot: ProductSnapshot): Product {
    return new Product(
      snapshot.id,
      snapshot.userId,
      snapshot.productName,
      snapshot.url,
      snapshot.productType,
      snapshot.productDescription,
      snapshot.serviceStartRule,
      snapshot.refundPolicyDisclosure,
      snapshot.cancellationPolicyDisclosure,
      snapshot.status,
      snapshot.createdAt,
      snapshot.updatedAt,
    )
  }

  update(input: UpdateProductInput): Result<void, ValidationError> {
    const parsed = updateProductInputSchema.safeParse(input)
    if (!parsed.success) {
      return Result.err(
        new ValidationError({
          issues: parsed.error.issues.map((issue) => ({
            code: issue.code,
            path: issue.path.map(String),
            message: issue.message,
          })),
        }),
      )
    }

    Object.assign(this, parsed.data)
    this.updatedAt = new Date()
    this.addEvent(createEvent('ProductUpdated', { productId: this.id, userId: this.userId }))

    return Result.ok(undefined)
  }

  markDeleted(): void {
    this.addEvent(createEvent('ProductDeleted', { productId: this.id, userId: this.userId }))
  }

  hasApprovedProductEvidenceFields(): boolean {
    return requiredProductEvidenceFieldIssues(this.serialize()).length === 0
  }

  completeSetup(): Result<void, ValidationError> {
    if (this.status !== 'setup_pending') {
      return Result.err(
        new ValidationError({
          issues: [
            {
              code: 'invalid_product',
              path: ['status'],
              message: `Cannot complete setup when status is ${this.status}`,
            },
          ],
        }),
      )
    }
    const evidenceIssues = requiredProductEvidenceFieldIssues(this.serialize())
    if (evidenceIssues.length > 0) {
      return Result.err(
        new ValidationError({
          issues: evidenceIssues,
        }),
      )
    }

    this.status = 'setup_complete'
    this.updatedAt = new Date()
    this.addEvent(createEvent('ProductSetupCompleted', { productId: this.id, userId: this.userId }))

    return Result.ok(undefined)
  }

  disable(): Result<void, ValidationError> {
    if (this.status !== 'setup_complete') {
      return Result.err(
        new ValidationError({
          issues: [
            {
              code: 'invalid_product',
              path: ['status'],
              message: `Cannot disable when status is ${this.status}`,
            },
          ],
        }),
      )
    }

    this.status = 'disabled'
    this.updatedAt = new Date()
    this.addEvent(createEvent('ProductDisabled', { productId: this.id, userId: this.userId }))

    return Result.ok(undefined)
  }

  enable(): Result<void, ValidationError> {
    if (this.status !== 'disabled') {
      return Result.err(
        new ValidationError({
          issues: [
            {
              code: 'invalid_product',
              path: ['status'],
              message: `Cannot enable when status is ${this.status}`,
            },
          ],
        }),
      )
    }

    this.status = 'setup_complete'
    this.updatedAt = new Date()
    this.addEvent(createEvent('ProductEnabled', { productId: this.id, userId: this.userId }))

    return Result.ok(undefined)
  }

  getStatus(): ProductStatus {
    return this.status
  }

  serialize(): ProductSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      productName: this.productName,
      url: this.url,
      productType: this.productType,
      productDescription: this.productDescription,
      serviceStartRule: this.serviceStartRule,
      refundPolicyDisclosure: this.refundPolicyDisclosure,
      cancellationPolicyDisclosure: this.cancellationPolicyDisclosure,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}

function requiredProductEvidenceFieldIssues(product: ProductEvidenceSetupSnapshot) {
  const issues: Array<{ code: string; path: string[]; message: string }> = []

  if (product.productDescription === null) {
    issues.push({
      code: 'invalid_product',
      path: ['productDescription'],
      message: 'productDescription is required to complete setup',
    })
  }
  if (product.serviceStartRule === null) {
    issues.push({
      code: 'invalid_product',
      path: ['serviceStartRule'],
      message: 'serviceStartRule is required to complete setup',
    })
  }
  if (product.refundPolicyDisclosure === null) {
    issues.push({
      code: 'invalid_product',
      path: ['refundPolicyDisclosure'],
      message: 'refundPolicyDisclosure is required to complete setup',
    })
  }
  if (product.cancellationPolicyDisclosure === null) {
    issues.push({
      code: 'invalid_product',
      path: ['cancellationPolicyDisclosure'],
      message: 'cancellationPolicyDisclosure is required to complete setup',
    })
  }

  return issues
}
