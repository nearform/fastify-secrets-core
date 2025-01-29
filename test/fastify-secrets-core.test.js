'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

const { buildPlugin } = require('../lib/fastify-secrets-core')

test('buildPlugin should be defined', () => {
  assert.ok(buildPlugin)
})
