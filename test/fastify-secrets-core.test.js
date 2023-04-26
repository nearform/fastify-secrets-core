'use strict'

import { test } from 'tap'
import buildPlugin from '../lib/fastify-secrets-core.js'

test('buildPlugin should be defined', async (t) => {
  t.ok(buildPlugin)
})
