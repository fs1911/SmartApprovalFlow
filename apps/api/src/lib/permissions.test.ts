import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleHasPermission, canAssignRole } from '@saf/types';

test('viewer is read-only', () => {
  assert.equal(roleHasPermission('VIEWER', 'cases:read'), true);
  assert.equal(roleHasPermission('VIEWER', 'cases:create'), false);
  assert.equal(roleHasPermission('VIEWER', 'cases:send'), false);
  assert.equal(roleHasPermission('VIEWER', 'templates:write'), false);
});

test('advisor can run the case workflow but not administer the workspace', () => {
  assert.equal(roleHasPermission('SERVICE_ADVISOR', 'cases:create'), true);
  assert.equal(roleHasPermission('SERVICE_ADVISOR', 'cases:send'), true);
  assert.equal(roleHasPermission('SERVICE_ADVISOR', 'members:manage'), false);
  assert.equal(roleHasPermission('SERVICE_ADVISOR', 'workspace:manage'), false);
  assert.equal(roleHasPermission('SERVICE_ADVISOR', 'templates:write'), false);
});

test('technician is limited to reading + annotating', () => {
  assert.equal(roleHasPermission('TECHNICIAN', 'cases:read'), true);
  assert.equal(roleHasPermission('TECHNICIAN', 'cases:annotate'), true);
  assert.equal(roleHasPermission('TECHNICIAN', 'cases:create'), false);
});

test('owner and admin have full permissions', () => {
  for (const p of ['members:manage', 'workspace:manage', 'templates:write'] as const) {
    assert.equal(roleHasPermission('OWNER', p), true);
    assert.equal(roleHasPermission('ADMIN', p), true);
  }
});

test('only owner can assign the OWNER role', () => {
  assert.equal(canAssignRole('OWNER', 'OWNER'), true);
  assert.equal(canAssignRole('ADMIN', 'OWNER'), false);
  assert.equal(canAssignRole('ADMIN', 'SERVICE_ADVISOR'), true);
  assert.equal(canAssignRole('SERVICE_ADVISOR', 'VIEWER'), false); // no members:manage
});
