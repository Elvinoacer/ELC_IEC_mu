"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminShell from "@/components/layouts/AdminShell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface Candidate {
  id: number;
  name: string;
  phone: string;
  school: string;
  yearOfStudy: string;
  position: string;
  scholarCode: string;
  photoUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  submittedAt: string;
}

interface NewCandidateForm {
  name: string;
  phone: string;
  school: string;
  yearOfStudy: string;
  position: string;
  scholarCode: string;
  photoUrl: string;
  status: "PENDING" | "APPROVED";
}

type CandidateFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CandidateFilter>("PENDING");

  // Rejection Modal State
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Edit Modal State
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [positions, setPositions] = useState<{ id: number; title: string }[]>(
    [],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState<NewCandidateForm>({
    name: "",
    phone: "",
    school: "",
    yearOfStudy: "1st Year",
    position: "",
    scholarCode: "",
    photoUrl: "",
    status: "APPROVED",
  });

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/positions");
      const json = await res.json();
      if (res.ok) setPositions(json.data);
    } catch (err) {
      console.error("Failed to fetch positions", err);
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter !== "ALL" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/candidates${qs}`);
      const json = await res.json();
      if (res.ok) {
        setCandidates(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch candidates", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchCandidates();
      void fetchPositions();
    });
  }, [fetchCandidates, fetchPositions]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCandidate) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${editCandidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCandidate.name,
          school: editCandidate.school,
          yearOfStudy: editCandidate.yearOfStudy,
          position: editCandidate.position,
          scholarCode: editCandidate.scholarCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEditCandidate(null);
      fetchCandidates();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update candidate";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (
    id: number,
    status: "APPROVED" | "REJECTED",
    note?: string,
  ) => {
    if (
      status === "APPROVED" &&
      !window.confirm(
        "Approve this candidate? They will appear on the ballot instantly.",
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionNote: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRejectId(null);
      setRejectReason("");
      fetchCandidates();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCandidate),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add candidate");

      setShowCreateModal(false);
      setNewCandidate({
        name: "",
        phone: "",
        school: "",
        yearOfStudy: "1st Year",
        position: "",
        scholarCode: "",
        photoUrl: "",
        status: "APPROVED",
      });
      fetchCandidates();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add candidate";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell title="Candidate Review">
      <div className="fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">
              Add, review, and manage candidate records.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              Add Candidate
            </Button>
            <div className="flex bg-surface-800 p-1 rounded-xl border border-glass-border">
              {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      filter === f
                        ? "bg-brand-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            Loading candidates...
          </div>
        ) : candidates.length === 0 ? (
          <Card
            padding="lg"
            className="text-center text-slate-400 border-dashed border-2"
          >
            No candidates found in this category.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {candidates.map((candidate) => (
              <Card
                key={candidate.id}
                className="overflow-hidden flex flex-col sm:flex-row gap-6 p-6"
              >
                <div className="shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-white/10 bg-surface-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={candidate.photoUrl}
                    alt={candidate.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(candidate.name) +
                        "&background=2563eb&color=fff";
                    }}
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {candidate.name}
                        </h3>
                        <p className="text-sm font-medium text-brand-400">
                          {candidate.position}
                        </p>
                      </div>
                      <Badge
                        variant={
                          candidate.status === "APPROVED"
                            ? "success"
                            : candidate.status === "REJECTED"
                              ? "error"
                              : "default"
                        }
                      >
                        {candidate.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-y-1 text-sm text-slate-300 mt-3">
                      <div>
                        <span className="text-slate-500">Code:</span>{" "}
                        {candidate.scholarCode}
                      </div>
                      <div>
                        <span className="text-slate-500">Phone:</span>{" "}
                        {candidate.phone}
                      </div>
                      <div>
                        <span className="text-slate-500">School:</span>{" "}
                        {candidate.school}
                      </div>
                      <div>
                        <span className="text-slate-500">Year:</span>{" "}
                        {candidate.yearOfStudy}
                      </div>
                    </div>

                    {candidate.status === "REJECTED" &&
                      candidate.rejectionNote && (
                        <div className="mt-3 p-2 rounded bg-error-500/10 border border-error-500/20 text-xs text-error-400">
                          <span className="font-semibold">Reason:</span>{" "}
                          {candidate.rejectionNote}
                        </div>
                      )}
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-glass-border">
                    {candidate.status !== "REJECTED" && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setEditCandidate(candidate)}
                        className="text-brand-400 hover:text-brand-300"
                      >
                        Edit Details
                      </Button>
                    )}

                    {candidate.status === "PENDING" && (
                      <div className="flex gap-2 flex-1 justify-end ml-4">
                        <Button
                          size="sm"
                          variant="primary"
                          className="px-6"
                          onClick={() =>
                            handleStatusUpdate(candidate.id, "APPROVED")
                          }
                          disabled={isSubmitting}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-error-500/30 text-error-400 hover:bg-error-500/10 hover:border-error-500"
                          onClick={() => setRejectId(candidate.id)}
                          disabled={isSubmitting}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-2xl bg-surface-800 border border-glass-border p-8 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white mb-6">Add Candidate</h3>
            <form onSubmit={handleCreateCandidate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    Full Name
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={newCandidate.name}
                    onChange={(e) =>
                      setNewCandidate({ ...newCandidate, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    Phone Number
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={newCandidate.phone}
                    onChange={(e) =>
                      setNewCandidate({
                        ...newCandidate,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+2547XXXXXXXX"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    Scholar Code
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={newCandidate.scholarCode}
                    onChange={(e) =>
                      setNewCandidate({
                        ...newCandidate,
                        scholarCode: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    School / Campus
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={newCandidate.school}
                    onChange={(e) =>
                      setNewCandidate({
                        ...newCandidate,
                        school: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    Year of Study
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none"
                    value={newCandidate.yearOfStudy}
                    onChange={(e) =>
                      setNewCandidate({
                        ...newCandidate,
                        yearOfStudy: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                    <option value="6th Year">6th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    Initial Status
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none"
                    value={newCandidate.status}
                    onChange={(e) =>
                      setNewCandidate({
                        ...newCandidate,
                        status: e.target.value as "PENDING" | "APPROVED",
                      })
                    }
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-400">
                  Position Running For
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none"
                  value={newCandidate.position}
                  onChange={(e) =>
                    setNewCandidate({
                      ...newCandidate,
                      position: e.target.value,
                    })
                  }
                  required
                >
                  <option value="" disabled>
                    Select position
                  </option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.title}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-400">
                  Candidate Photo URL
                </label>
                <input
                  type="url"
                  className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={newCandidate.photoUrl}
                  onChange={(e) =>
                    setNewCandidate({
                      ...newCandidate,
                      photoUrl: e.target.value,
                    })
                  }
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Save Candidate
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {editCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-2xl bg-surface-800 border border-glass-border p-8 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white mb-6">
              Edit Candidate Details
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    Full Name
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={editCandidate.name}
                    onChange={(e) =>
                      setEditCandidate({
                        ...editCandidate,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    Scholar Code
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={editCandidate.scholarCode}
                    onChange={(e) =>
                      setEditCandidate({
                        ...editCandidate,
                        scholarCode: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    School / Campus
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={editCandidate.school}
                    onChange={(e) =>
                      setEditCandidate({
                        ...editCandidate,
                        school: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-400">
                    Year of Study
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none"
                    value={editCandidate.yearOfStudy}
                    onChange={(e) =>
                      setEditCandidate({
                        ...editCandidate,
                        yearOfStudy: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                    <option value="6th Year">6th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-400">
                  Position Running For
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none"
                  value={editCandidate.position}
                  onChange={(e) =>
                    setEditCandidate({
                      ...editCandidate,
                      position: e.target.value,
                    })
                  }
                  required
                >
                  {positions.map((p) => (
                    <option key={p.id} value={p.title}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setEditCandidate(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-surface-800 border border-glass-border rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-2">
              Reject Candidate
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Please provide a reason. This will be sent to the candidate via
              SMS.
            </p>

            <textarea
              className="w-full px-4 py-3 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-error-500 mb-4 h-24"
              placeholder="e.g. Blurry photo, invalid scholar code..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setRejectId(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  handleStatusUpdate(rejectId, "REJECTED", rejectReason)
                }
                disabled={!rejectReason.trim() || isSubmitting}
                className="bg-error-600 hover:bg-error-500 text-white border-none"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
