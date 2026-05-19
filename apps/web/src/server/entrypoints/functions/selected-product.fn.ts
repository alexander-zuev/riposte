import { toServerFnRpc } from '@riposte/core'
import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { Result } from 'better-result'
import { z } from 'zod'

const SELECTED_PRODUCT_COOKIE_NAME = 'selected_product_id'
const SELECTED_PRODUCT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const getSelectedProductIdServerFn = createServerFn().handler(async () => {
  const productId = getCookie(SELECTED_PRODUCT_COOKIE_NAME) ?? null
  return toServerFnRpc(Result.ok(productId))
})

export const setSelectedProductIdServerFn = createServerFn()
  .inputValidator(z.object({ productId: z.uuid().nullable() }))
  .handler(async ({ data }) => {
    const current = getCookie(SELECTED_PRODUCT_COOKIE_NAME) ?? null
    if (current === data.productId) {
      return toServerFnRpc(Result.ok(null))
    }
    if (data.productId === null) {
      deleteCookie(SELECTED_PRODUCT_COOKIE_NAME)
    } else {
      setCookie(SELECTED_PRODUCT_COOKIE_NAME, data.productId, {
        path: '/',
        maxAge: SELECTED_PRODUCT_COOKIE_MAX_AGE,
        httpOnly: false,
        sameSite: 'lax',
      })
    }
    return toServerFnRpc(Result.ok(null))
  })
