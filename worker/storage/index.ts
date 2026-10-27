import type { Env } from '../types'
import { B2StorageProvider } from './b2'
import { LocalStorageProvider } from './local'
import type { StorageProvider } from './types'
import { StorageProviderError } from './types'

const LOCAL_DEFAULT_SECRET = 'vocal-journal-local-development-only'

function required(value: string | undefined, name: string): string {
  if (!value) throw new StorageProviderError(`MISSING_${name}`)
  return value
}

export function getStorageProvider(
  env: Env,
  requestedProvider?: 'local' | 'b2',
): StorageProvider {
  const provider = requestedProvider ?? env.MEDIA_STORAGE_PROVIDER ?? 'local'
  if (provider === 'b2') {
    return new B2StorageProvider({
      endpoint: required(env.B2_ENDPOINT, 'B2_ENDPOINT'),
      region: required(env.B2_REGION, 'B2_REGION'),
      bucket: required(env.B2_BUCKET, 'B2_BUCKET'),
      keyId: required(env.B2_KEY_ID, 'B2_KEY_ID'),
      applicationKey: required(
        env.B2_APPLICATION_KEY,
        'B2_APPLICATION_KEY',
      ),
    })
  }

  return new LocalStorageProvider(
    env.LOCAL_MEDIA_BASE_URL ?? 'http://127.0.0.1:8790',
    env.LOCAL_MEDIA_SIGNING_SECRET ?? LOCAL_DEFAULT_SECRET,
  )
}

export type {
  MediaAccess,
  StorageProvider,
  StoredObjectMetadata,
  UploadAuthorization,
  UploadVerification,
} from './types'
export { StorageObjectMissingError, StorageProviderError } from './types'
