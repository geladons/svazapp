/**
 * Call Service
 *
 * Handles call history management for 1-on-1 video/audio calls.
 * Stores call metadata: participants, type, status, duration, timestamps.
 *
 * @module services/call.service
 */

import { PrismaClient, Call, CallType, CallStatus, CallMode, CallDirection, Prisma } from '@prisma/client';

/**
 * Call with participant information
 */
export interface CallWithParticipant extends Call {
  participant: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isOnline: boolean;
    lastSeenAt: Date;
  };
  direction: CallDirection;
}

/**
 * Call Service
 *
 * Provides methods for managing call history and metadata.
 */
export class CallService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new call record
   *
   * Creates a call record when a call is initiated.
   * Sets initial status to RINGING.
   *
   * @param callerId - ID of user initiating the call
   * @param receiverId - ID of user receiving the call
   * @param type - Call type (AUDIO, VIDEO, SCREEN)
   * @param mode - Call mode (NORMAL, EMERGENCY, ASYMMETRIC)
   * @returns Created call record
   */
  async createCall(
    callerId: string,
    receiverId: string,
    type: CallType,
    mode: CallMode = CallMode.NORMAL
  ): Promise<Call> {
    const call = await this.prisma.call.create({
      data: {
        callerId,
        receiverId,
        type,
        mode,
        status: CallStatus.RINGING,
      },
    });

    return call;
  }

  /**
   * Update call status
   *
   * Updates the status of an existing call.
   * If status is ANSWERED, sets startedAt timestamp.
   *
   * @param callId - Call ID
   * @param status - New status
   * @returns Updated call record
   */
  async updateCallStatus(callId: string, status: CallStatus): Promise<Call> {
    const updateData: Prisma.CallUpdateInput = { status };

    // Set startedAt when call is answered
    if (status === CallStatus.ANSWERED) {
      updateData.startedAt = new Date();
    }

    const call = await this.prisma.call.update({
      where: { id: callId },
      data: updateData,
    });

    return call;
  }

  /**
   * End a call
   *
   * Sets endedAt timestamp and calculates duration.
   * Updates status to ENDED.
   *
   * @param callId - Call ID
   * @returns Updated call record
   */
  async endCall(callId: string): Promise<Call> {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    const endedAt = new Date();
    let duration = 0;

    // Calculate duration if call was answered
    if (call.startedAt) {
      duration = Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000);
    }

    const updatedCall = await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: CallStatus.ENDED,
        endedAt,
        duration,
      },
    });

    return updatedCall;
  }

  /**
   * Mark call as missed
   *
   * Updates call status to MISSED.
   * Used when receiver doesn't answer within timeout (30s).
   *
   * @param callId - Call ID
   * @returns Updated call record
   */
  async markCallAsMissed(callId: string): Promise<Call> {
    const call = await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: CallStatus.MISSED,
        endedAt: new Date(),
      },
    });

    return call;
  }

  /**
   * Mark call as rejected
   *
   * Updates call status to REJECTED.
   * Used when receiver explicitly rejects the call.
   *
   * @param callId - Call ID
   * @returns Updated call record
   */
  async markCallAsRejected(callId: string): Promise<Call> {
    const call = await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: CallStatus.REJECTED,
        endedAt: new Date(),
      },
    });

    return call;
  }

  /**
   * Mark call as cancelled
   *
   * Updates call status to CANCELLED.
   * Used when caller cancels before receiver answers.
   *
   * @param callId - Call ID
   * @returns Updated call record
   */
  async markCallAsCancelled(callId: string): Promise<Call> {
    const call = await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: CallStatus.CANCELLED,
        endedAt: new Date(),
      },
    });

    return call;
  }

  /**
   * Get call history for a user
   *
   * Returns calls sorted by creation time (most recent first).
   * Includes participant information for each call.
   * Supports filtering by status (all or missed only).
   *
   * @param userId - User ID
   * @param filter - Filter: 'all' | 'missed'
   * @param limit - Max results (default: 50)
   * @returns Array of calls with participant info
   */
  async getCallHistory(
    userId: string,
    filter: 'all' | 'missed' = 'all',
    limit: number = 50
  ): Promise<CallWithParticipant[]> {
    // Build where clause
    const where: Prisma.CallWhereInput = {
      OR: [{ callerId: userId }, { receiverId: userId }],
    };

    // Add filter for missed calls
    if (filter === 'missed') {
      where.status = CallStatus.MISSED;
    }

    // Fetch calls with participant info
    const calls = await this.prisma.call.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        caller: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
      },
    });

    // Transform to CallWithParticipant format
    const callsWithParticipant: CallWithParticipant[] = calls.map((call) => {
      // Determine participant (the other user)
      const isOutgoing = call.callerId === userId;
      const participant = isOutgoing ? call.receiver : call.caller;
      const direction = isOutgoing ? CallDirection.OUTGOING : CallDirection.INCOMING;

      return {
        ...call,
        participant,
        direction,
      };
    });

    return callsWithParticipant;
  }
}

