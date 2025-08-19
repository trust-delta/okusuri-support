/**
 * 招待一覧表示コンポーネント
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/features/auth'
import type { Invitation, PairError } from '../types'

interface InvitationListProps {
  sentInvitations: Invitation[]
  receivedInvitations: Invitation[]
  onCancelInvitation?: (invitationId: string) => Promise<void>
  onRespondToInvitation?: (token: string, action: 'accept' | 'reject') => Promise<void>
  isLoading?: boolean
  error?: PairError
  className?: string
}

export function InvitationList({
  sentInvitations,
  receivedInvitations,
  onCancelInvitation,
  onRespondToInvitation,
  isLoading,
  error,
  className,
}: InvitationListProps) {
  const { user } = useAuth()
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})

  /**
   * ステータス表示用ラベル
   */
  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '応答待ち',
      accepted: '承認済み',
      rejected: '拒否済み',
      expired: '有効期限切れ',
    }
    return labels[status as keyof typeof labels] || status
  }

  /**
   * ステータスの色クラス
   */
  const getStatusColorClass = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  /**
   * 日付フォーマット
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * 招待キャンセル処理
   */
  const handleCancelInvitation = async (invitationId: string) => {
    if (!onCancelInvitation) return
    
    setActionLoading(prev => ({ ...prev, [`cancel_${invitationId}`]: true }))
    
    try {
      await onCancelInvitation(invitationId)
    } finally {
      setActionLoading(prev => ({ ...prev, [`cancel_${invitationId}`]: false }))
    }
  }

  /**
   * 招待への応答処理
   */
  const handleRespondToInvitation = async (token: string, action: 'accept' | 'reject') => {
    if (!onRespondToInvitation) return
    
    setActionLoading(prev => ({ ...prev, [`${action}_${token}`]: true }))
    
    try {
      await onRespondToInvitation(token, action)
    } finally {
      setActionLoading(prev => ({ ...prev, [`${action}_${token}`]: false }))
    }
  }

  /**
   * 招待カードコンポーネント
   */
  const InvitationCard = ({ invitation, type }: { invitation: Invitation; type: 'sent' | 'received' }) => {
    const isExpired = new Date(invitation.expiresAt) < new Date()
    const canCancel = type === 'sent' && invitation.status === 'pending' && !isExpired
    const canRespond = type === 'received' && invitation.status === 'pending' && !isExpired

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusColorClass(invitation.status)
              }`}>
                {getStatusLabel(invitation.status)}
              </span>
              {isExpired && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  有効期限切れ
                </span>
              )}
            </div>
            
            <div className="space-y-1 text-sm">
              {type === 'sent' ? (
                <>
                  <p><span className="font-medium">送信先:</span> {invitation.inviteeEmail}</p>
                  <p><span className="font-medium">役割:</span> {invitation.targetRole === 'patient' ? '患者' : '支援者'}</p>
                </>
              ) : (
                <>
                  <p><span className="font-medium">送信者:</span> {invitation.inviterName} ({invitation.inviterRole === 'patient' ? '患者' : '支援者'})</p>
                  <p><span className="font-medium">あなたの役割:</span> {invitation.targetRole === 'patient' ? '患者' : '支援者'}</p>
                </>
              )}
              <p><span className="font-medium">送信日時:</span> {formatDate(invitation.createdAt)}</p>
              <p><span className="font-medium">有効期限:</span> {formatDate(invitation.expiresAt)}</p>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex space-x-2 pt-3 border-t border-gray-100">
          {canCancel && (
            <button
              type="button"
              onClick={() => handleCancelInvitation(invitation.id)}
              disabled={actionLoading[`cancel_${invitation.id}`]}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
            >
              {actionLoading[`cancel_${invitation.id}`] ? 'キャンセル中...' : 'キャンセル'}
            </button>
          )}
          
          {canRespond && (
            <>
              <button
                type="button"
                onClick={() => handleRespondToInvitation(invitation.token, 'accept')}
                disabled={actionLoading[`accept_${invitation.token}`]}
                className="px-3 py-1 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
              >
                {actionLoading[`accept_${invitation.token}`] ? '承認中...' : '承認'}
              </button>
              <button
                type="button"
                onClick={() => handleRespondToInvitation(invitation.token, 'reject')}
                disabled={actionLoading[`reject_${invitation.token}`]}
                className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
              >
                {actionLoading[`reject_${invitation.token}`] ? '拒否中...' : '拒否'}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={className}>
        <div className="text-center text-gray-600">
          招待一覧を表示するにはログインが必要です。
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-300 rounded-md p-3">
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <p className="mt-2 text-sm text-gray-600">招待情報を読み込み中...</p>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {/* 受信した招待 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              受信した招待 ({receivedInvitations.length}件)
            </h3>
            {receivedInvitations.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-600">受信した招待はありません。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedInvitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    type="received"
                  />
                ))}
              </div>
            )}
          </div>

          {/* 送信した招待 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              送信した招待 ({sentInvitations.length}件)
            </h3>
            {sentInvitations.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-600">送信した招待はありません。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentInvitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    type="sent"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}