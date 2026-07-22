export type CulqiEnvironment = 'test' | 'live';

export interface ICulqiConfiguration {
  enabled: boolean;
  publicKey?: string;
  privateKeyConfigured: boolean;
  encryptionReady: boolean;
  environment?: CulqiEnvironment;
}

export interface IUpdateCulqiConfiguration {
  enabled: boolean;
  publicKey?: string;
  privateKey?: string;
  clearPrivateKey?: boolean;
}
