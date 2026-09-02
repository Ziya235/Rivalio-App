import { useEffect, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { Bell, Check, CheckCircle2, XCircle } from "lucide-react";

import { Avatar } from "./ui";

import { useSocket } from "../context/SocketContext";

import {

  acceptFriendRequest,

  rejectFriendRequest,

} from "../api/friends";

import {

  markAllNotificationsRead,

  markNotificationRead,

  type AppNotification,

} from "../api/notifications";



type NotificationBellProps = {

  isLightMode?: boolean;

};



function formatTime(value: string) {

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("az", {

    day: "numeric",

    month: "short",

    hour: "2-digit",

    minute: "2-digit",

  });

}



function notificationLabel(notification: AppNotification) {

  if (

    notification.type === "FRIEND_REQUEST" &&

    notification.friendRequestStatus === "ACCEPTED"

  ) {

    return "dostluq sorğusunu qəbul etdiniz";

  }

  if (

    notification.type === "FRIEND_REQUEST" &&

    notification.friendRequestStatus === "REJECTED"

  ) {

    return "dostluq sorğusunu rədd etdiniz";

  }



  switch (notification.type) {

    case "FRIEND_REQUEST":

      return "sizə dostluq sorğusu göndərdi";

    case "FRIEND_ACCEPTED":

      return "dostluq sorğunuzu qəbul etdi";

    case "NEW_MESSAGE":

      return "yeni mesaj göndərdi";

    default:

      return "bildiriş göndərdi";

  }

}



function isPendingFriendRequest(notification: AppNotification) {

  return (

    notification.type === "FRIEND_REQUEST" &&

    (notification.friendRequestStatus === "PENDING" ||

      notification.friendRequestStatus == null)

  );

}



export default function NotificationBell({

  isLightMode = false,

}: NotificationBellProps) {

  const navigate = useNavigate();

  const {

    notifications,

    unreadCount,

    refreshNotifications,

    markLocalNotificationRead,

    patchNotification,

  } = useSocket();

  const [open, setOpen] = useState(false);

  const [actionId, setActionId] = useState<number | null>(null);

  const ref = useRef<HTMLDivElement>(null);



  const iconButton = isLightMode

    ? "text-slate-600 hover:text-slate-950 hover:bg-slate-900/5"

    : "text-white/70 hover:text-white hover:bg-white/5";

  const panel = isLightMode

    ? "bg-white border-slate-900/10"

    : "bg-[#12121a] border-white/10";

  const strongText = isLightMode ? "text-slate-900" : "text-white";

  const mutedText = isLightMode ? "text-slate-500" : "text-white/45";



  useEffect(() => {

    if (!open) return;

    refreshNotifications();

  }, [open, refreshNotifications]);



  useEffect(() => {

    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {

      if (ref.current && !ref.current.contains(event.target as Node)) {

        setOpen(false);

      }

    };

    document.addEventListener("mousedown", onPointerDown);

    return () => document.removeEventListener("mousedown", onPointerDown);

  }, [open]);



  const handleRead = async (notification: AppNotification) => {

    if (notification.isRead) return;

    markLocalNotificationRead(notification.id);

    await markNotificationRead(notification.id);

  };



  const handleAccept = async (notification: AppNotification) => {

    if (!notification.entityId) return;

    setActionId(notification.id);

    try {

      await acceptFriendRequest(Number(notification.entityId));

      patchNotification(notification.id, {

        friendRequestStatus: "ACCEPTED",

        isRead: true,

      });

      if (!notification.isRead) {

        markLocalNotificationRead(notification.id);

      }

      await refreshNotifications();

    } finally {

      setActionId(null);

    }

  };



  const handleReject = async (notification: AppNotification) => {

    if (!notification.entityId) return;

    setActionId(notification.id);

    try {

      await rejectFriendRequest(Number(notification.entityId));

      patchNotification(notification.id, {

        friendRequestStatus: "REJECTED",

        isRead: true,

      });

      if (!notification.isRead) {

        markLocalNotificationRead(notification.id);

      }

      await refreshNotifications();

    } finally {

      setActionId(null);

    }

  };



  return (

    <div className="relative" ref={ref}>

      <button

        type="button"

        onClick={() => setOpen((current) => !current)}

        className={`relative p-2 rounded-lg transition-all ${iconButton}`}

        aria-label="Bildirişlər"

      >

        <Bell size={18} />

        {unreadCount > 0 && (

          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#c5f135] text-[#08080e] text-[10px] font-bold flex items-center justify-center">

            {unreadCount > 99 ? "99+" : unreadCount}

          </span>

        )}

      </button>



      {open && (

        <div

          className={`absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden z-50 ${panel}`}

        >

          <div

            className={`flex items-center justify-between px-4 py-3 border-b ${

              isLightMode ? "border-slate-900/10" : "border-white/8"

            }`}

          >

            <p className={`text-sm font-semibold ${strongText}`}>Bildirişlər</p>

            <button

              type="button"

              onClick={async () => {

                await markAllNotificationsRead();

                await refreshNotifications();

              }}

              className={`text-xs ${mutedText} hover:underline`}

            >

              Hamısını oxundu say

            </button>

          </div>



          <div className="max-h-[420px] overflow-y-auto">

            {notifications.length === 0 ? (

              <p className={`px-4 py-8 text-center text-sm ${mutedText}`}>

                Bildiriş yoxdur

              </p>

            ) : (

              notifications.map((notification) => {

                const actorName = notification.actor

                  ? `${notification.actor.firstName} ${notification.actor.lastName}`.trim()

                  : "İstifadəçi";

                const busy = actionId === notification.id;

                const pending = isPendingFriendRequest(notification);

                const accepted =

                  notification.type === "FRIEND_REQUEST" &&

                  notification.friendRequestStatus === "ACCEPTED";

                const rejected =

                  notification.type === "FRIEND_REQUEST" &&

                  notification.friendRequestStatus === "REJECTED";



                return (

                  <div

                    key={notification.id}

                    className={`px-4 py-3 border-b last:border-b-0 ${

                      isLightMode ? "border-slate-900/8" : "border-white/6"

                    } ${notification.isRead ? "opacity-80" : ""}`}

                  >

                    <div className="flex gap-3">

                      <Avatar

                        name={actorName}

                        src={notification.actor?.image || undefined}

                        size="sm"

                      />

                      <div className="min-w-0 flex-1">

                        <p className={`text-sm ${strongText}`}>

                          <span className="font-semibold">{actorName}</span>{" "}

                          <span className={mutedText}>

                            {notificationLabel(notification)}

                          </span>

                        </p>

                        <p className={`mt-1 text-[11px] ${mutedText}`}>

                          {formatTime(notification.createdAt)}

                        </p>



                        {pending && notification.entityId ? (

                          <div className="mt-2 flex gap-2">

                            <button

                              type="button"

                              disabled={busy}

                              onClick={() => handleAccept(notification)}

                              className="px-3 py-1.5 rounded-lg bg-[#c5f135] text-[#08080e] text-xs font-semibold disabled:opacity-50"

                            >

                              Qəbul et

                            </button>

                            <button

                              type="button"

                              disabled={busy}

                              onClick={() => handleReject(notification)}

                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${

                                isLightMode

                                  ? "border-slate-900/15 text-slate-700"

                                  : "border-white/15 text-white/75"

                              } disabled:opacity-50`}

                            >

                              Rədd et

                            </button>

                          </div>

                        ) : null}



                        {accepted ? (

                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-500">

                            <CheckCircle2 size={13} />

                            Qəbul edildi

                          </p>

                        ) : null}



                        {rejected ? (

                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-400">

                            <XCircle size={13} />

                            Rədd edildi

                          </p>

                        ) : null}



                        {notification.type === "FRIEND_ACCEPTED" &&

                        notification.actor ? (

                          <button

                            type="button"

                            onClick={() => {

                              handleRead(notification);

                              navigate(`/chat?user=${notification.actor!.id}`);

                              setOpen(false);

                            }}

                            className="mt-2 text-xs font-semibold text-[#c5f135]"

                          >

                            Mesaj yaz

                          </button>

                        ) : null}



                        {notification.type === "NEW_MESSAGE" &&

                        notification.entityId ? (

                          <button

                            type="button"

                            onClick={() => {

                              handleRead(notification);

                              navigate(

                                `/chat?conversation=${notification.entityId}`,

                              );

                              setOpen(false);

                            }}

                            className="mt-2 text-xs font-semibold text-[#c5f135]"

                          >

                            Mesaja keç

                          </button>

                        ) : null}



                        {!notification.isRead &&

                        !pending &&

                        notification.type !== "FRIEND_REQUEST" ? (

                          <button

                            type="button"

                            onClick={() => handleRead(notification)}

                            className={`mt-2 inline-flex items-center gap-1 text-[11px] ${mutedText}`}

                          >

                            <Check size={12} />

                            Oxundu

                          </button>

                        ) : null}

                      </div>

                    </div>

                  </div>

                );

              })

            )}

          </div>



          <button

            type="button"

            onClick={() => {

              setOpen(false);

              navigate("/notifications");

            }}

            className={`w-full px-4 py-3 text-xs font-medium border-t ${

              isLightMode

                ? "border-slate-900/10 text-slate-600 hover:bg-slate-900/5"

                : "border-white/8 text-white/60 hover:bg-white/5"

            }`}

          >

            Bütün bildirişlərə bax

          </button>

        </div>

      )}

    </div>

  );

}


