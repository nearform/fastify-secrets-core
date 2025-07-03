'use strict'

const { test } = require('node:test')

const buildPluginModule = require('../lib/fastify-secrets-core')

const { buildPlugin, default: buildPluginDefault } = buildPluginModule

test('buildPlugin should be defined', (t) => {
  t.assert.ok(buildPlugin)
})

test('buildPluginDefault should be defined', (t) => {
  t.assert.ok(buildPluginDefault)
})
