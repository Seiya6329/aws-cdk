import * as acmpca from '@aws-cdk/aws-acmpca';
import { CfnVirtualGateway, CfnVirtualNode } from './appmesh.generated';

// keep this import separate from other imports to reduce chance for merge conflicts with v2-main
// eslint-disable-next-line no-duplicate-imports, import/order
import { Construct } from '@aws-cdk/core';

/**
 * Represents the properties needed to define TLS Validation context
 */
export interface TlsValidation {
  /**
   * Represents the subject alternative names (SANs) secured by the certificate.
   * SANs must be in the FQDN or URI format.
   *
   * @default - the Envoy proxy for that node doesn't verify the SAN on a peer client certificate.
   */
  readonly subjectAlternativeNames?: SubjectiveAlternativeNames;

  /**
   * Reference to where to retrieve the trust chain.
   */
  readonly trust: TlsValidationTrust;
}

/**
 * All Properties for TLS Validation Trusts for both Client Policy and Listener.
 */
export interface TlsValidationTrustConfig {
  /**
   * VirtualNode CFN configuration for client policy's TLS Validation Trust
   */
  readonly tlsValidationTrust: CfnVirtualNode.TlsValidationContextTrustProperty;
}

/**
 * ACM Trust Properties
 */
export interface TlsValidationAcmTrustOptions {
  /**
   * Contains information for your private certificate authority
   */
  readonly certificateAuthorities: acmpca.ICertificateAuthority[];
}

/**
 * File Trust Properties
 */
export interface TlsValidationFileTrustOptions {
  /**
   * Path to the Certificate Chain file on the file system where the Envoy is deployed.
   */
  readonly certificateChain: string;
}

/**
 * SDS Trust Properties
 */
export interface TlsValidationSdsTrustOptions {
  /**
   * The name of the secret for Envoy to fetch from a specific endpoint through the Secrets Discovery Protocol.
   */
  readonly secretName: string;
}

/**
 * Defines the TLS Validation Context Trust.
 */
export abstract class TlsValidationTrust {
  /**
   * Tells envoy where to fetch the validation context from
   */
  public static file(props: TlsValidationFileTrustOptions): TlsValidationTrust {
    return new TlsValidationFileTrust(props);
  }

  /**
   * TLS Validation Context Trust for ACM Private Certificate Authority (CA).
   */
  public static acm(props: TlsValidationAcmTrustOptions): TlsValidationTrust {
    return new TlsValidationAcmTrust(props);
  }

  /**
   * TLS Validation Context Trust for Envoy' service discovery service.
   */
  public static sds(props: TlsValidationSdsTrustOptions): TlsValidationTrust {
    return new TlsValidationSdsTrust(props);
  }

  /**
   * Returns Trust context based on trust type.
   */
  public abstract bind(scope: Construct): TlsValidationTrustConfig;
}

class TlsValidationAcmTrust extends TlsValidationTrust {
  /**
   * Contains information for your private certificate authority
   */
  readonly certificateAuthorities: acmpca.ICertificateAuthority[];

  constructor (props: TlsValidationAcmTrustOptions) {
    super();
    this.certificateAuthorities = props.certificateAuthorities;
  }

  public bind(_scope: Construct): TlsValidationTrustConfig {
    if (this.certificateAuthorities.length === 0) {
      throw new Error('you must provide at least one Certificate Authority when creating an ACM Trust ClientPolicy');
    } else {
      return {
        tlsValidationTrust: {
          acm: {
            certificateAuthorityArns: this.certificateAuthorities.map(certificateArn =>
              certificateArn.certificateAuthorityArn),
          },
        },
      };
    }
  }
}

class TlsValidationFileTrust extends TlsValidationTrust {
  /**
   * Path to the Certificate Chain file on the file system where the Envoy is deployed.
   */
  readonly certificateChain: string;

  constructor (props: TlsValidationFileTrustOptions) {
    super();
    this.certificateChain = props.certificateChain;
  }

  public bind(_scope: Construct): TlsValidationTrustConfig {
    return {
      tlsValidationTrust: {
        file: {
          certificateChain: this.certificateChain,
        },
      },
    };
  }
}

class TlsValidationSdsTrust extends TlsValidationTrust {
  /**
   * The name of the secret for Envoy to fetch from a specific endpoint through the Secrets Discovery Protocol.
   */
  readonly secretName: string;

  constructor (props: TlsValidationSdsTrustOptions) {
    super();
    this.secretName = props.secretName;
  }

  public bind(_scope: Construct): TlsValidationTrustConfig {
    return {
      tlsValidationTrust: {
        sds: {
          secretName: this.secretName,
        },
      },
    };
  }
}

/**
 * All Properties for Subject Alternative Names Matcher for both Client Policy and Listener.
 */
export interface SubjectiveAlternativeNamesMatcherConfig {

  /**
   * VirtualNode CFN configuration for subject alternative names secured by the certificate.
   */
  readonly subjectAlternativeNamesMatch: CfnVirtualGateway.SubjectAlternativeNameMatchersProperty;
}

/**
 * Used to generate Subject Alternative Names Matchers
 */
export abstract class SubjectiveAlternativeNames {
  /**
   * The values of the SAN must match the specified values exactly.
   *
   * @param subjectAlternativeNames The exact values to test against.
   */
  public static exactMatch(subjectAlternativeNames: string[]): SubjectiveAlternativeNames {
    return new SubjectAlternativeNamesImpl({ exact: subjectAlternativeNames });
  }

  /**
   * Returns Subject Alternative Names Matcher based on method type.
   */
  public abstract bind(scope: Construct): SubjectiveAlternativeNamesMatcherConfig;
}

class SubjectAlternativeNamesImpl extends SubjectiveAlternativeNames {
  constructor(
    private readonly matchProperty: CfnVirtualNode.SubjectAlternativeNameMatchersProperty,
  ) {
    super();
  }

  public bind(_scope: Construct): SubjectiveAlternativeNamesMatcherConfig {
    return {
      subjectAlternativeNamesMatch: this.matchProperty,
    };
  }
}


