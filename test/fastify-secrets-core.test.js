import { test } from 'node:test'

import buildPluginModule, { buildPlugin } from '../lib/fastify-secrets-core.js'

test('buildPlugin should be defined', (t) => {
  t.assert.ok(buildPlugin)
})

test('buildPluginDefault should be defined', (t) => {
  t.assert.ok(buildPluginModule)
})
