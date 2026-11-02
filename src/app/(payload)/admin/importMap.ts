import type {ImportMap} from 'payload'
import AdminQuickLinks from '../../../components/AdminQuickLinks'
import {CollectionCards} from '@payloadcms/next/rsc'

// Keep the typed entry aligned with Payload's generated importMap.js.
export const importMap:ImportMap={
 '/components/AdminQuickLinks#default':AdminQuickLinks,
 '@payloadcms/next/rsc#CollectionCards':CollectionCards,
}
