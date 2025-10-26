/**
 * WebRTC Signaling Interfaces
 *
 * Type definitions for WebRTC signaling messages exchanged via Socket.io.
 * These interfaces ensure type safety for peer-to-peer connection establishment.
 *
 * @module interfaces/webrtc.interfaces
 */

/**
 * WebRTC Session Description (Offer/Answer)
 *
 * Represents an SDP (Session Description Protocol) message used in WebRTC negotiation.
 * This matches the structure of RTCSessionDescriptionInit from the WebRTC API.
 */
export interface WebRTCSessionDescription {
  /**
   * Type of session description
   * - 'offer': Initial connection proposal from caller
   * - 'answer': Response to offer from callee
   */
  type: 'offer' | 'answer';

  /**
   * SDP (Session Description Protocol) string
   * Contains media capabilities, codecs, network information, etc.
   */
  sdp: string;
}

/**
 * WebRTC ICE Candidate
 *
 * Represents a potential network path for establishing peer connection.
 * This matches the structure of RTCIceCandidateInit from the WebRTC API.
 */
export interface WebRTCIceCandidate {
  /**
   * Candidate string in SDP format
   * Contains IP address, port, protocol, and priority information
   */
  candidate: string;

  /**
   * Media stream identification tag
   * Associates candidate with specific media stream
   */
  sdpMid: string | null;

  /**
   * Index of the media description in the SDP
   * Used to match candidate with correct media line
   */
  sdpMLineIndex: number | null;

  /**
   * Username fragment for ICE
   * Used for authentication during connectivity checks
   */
  usernameFragment?: string | null;
}

/**
 * Signal Offer Payload
 *
 * Message sent from caller to callee to initiate WebRTC connection
 */
export interface SignalOfferPayload {
  /**
   * User ID of the recipient
   */
  to: string;

  /**
   * WebRTC offer (SDP)
   */
  offer: WebRTCSessionDescription;
}

/**
 * Signal Answer Payload
 *
 * Message sent from callee to caller in response to offer
 */
export interface SignalAnswerPayload {
  /**
   * User ID of the recipient (original caller)
   */
  to: string;

  /**
   * WebRTC answer (SDP)
   */
  answer: WebRTCSessionDescription;
}

/**
 * Signal ICE Candidate Payload
 *
 * Message sent to exchange ICE candidates for NAT traversal
 */
export interface SignalIceCandidatePayload {
  /**
   * User ID of the recipient
   */
  to: string;

  /**
   * ICE candidate information
   */
  candidate: WebRTCIceCandidate;
}

