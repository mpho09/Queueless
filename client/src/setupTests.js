import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'node:util'

// jsdom (Jest 29) doesn't provide these; react-router needs them.
Object.assign(globalThis, { TextEncoder, TextDecoder })
