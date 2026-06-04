// ─────────────────────────────────────────────────────────────────
// Add these to your AdminPortalPage component class
// ─────────────────────────────────────────────────────────────────

activeTab: 'list' | 'insights' = 'list';

// ── Initials for avatar ──────────────────────────────────────────
getInitials(user: any): string {
  const name = this.getUserDisplayName(user) || user.id || '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── KPI helpers ─────────────────────────────────────────────────
getVerifiedCount(): number {
  return this.users.filter(u => u.emailVerified).length;
}

getSubscribedCount(): number {
  return this.users.filter(u => u.isSubscribed).length;
}

getOverallAvgAps(): string {
  const scores: number[] = [];
  for (const u of this.users) {
    for (const aps of this.getUserApsScores(u)) {
      const v = parseFloat(aps.score ?? aps.value ?? '');
      if (!isNaN(v)) scores.push(v);
    }
  }
  if (!scores.length) return 'N/A';
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}

// ── Study level distribution ─────────────────────────────────────
getStudyLevelDistribution(): { label: string; count: number; pct: number; color: string }[] {
  const COLORS = ['#1a56db','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ef4444','#64748b'];
  const map = new Map<string, number>();
  for (const u of this.users) {
    const k = u.currentStudyLevel || 'Unknown';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const max = Math.max(...map.values(), 1);
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], i) => ({
      label,
      count,
      pct: Math.round((count / max) * 100),
      color: COLORS[i % COLORS.length],
    }));
}

// ── Top course choices ───────────────────────────────────────────
getTopCourseChoices(): { label: string; count: number; pct: number }[] {
  const map = new Map<string, number>();
  for (const u of this.users) {
    for (const c of (u.courseChoices ?? [])) {
      if (c) map.set(c, (map.get(c) ?? 0) + 1);
    }
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([label, count]) => ({
    label,
    count,
    pct: Math.round((count / max) * 100),
  }));
}

// ── Average APS by university ────────────────────────────────────
getAvgApsByUniversity(): { label: string; avg: number; pct: number }[] {
  const map = new Map<string, number[]>();
  for (const u of this.users) {
    for (const aps of this.getUserApsScores(u)) {
      const v = parseFloat(aps.score ?? aps.value ?? '');
      if (!isNaN(v)) {
        const key = aps.universityName ?? 'Unknown';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(v);
      }
    }
  }
  const avgs = [...map.entries()].map(([label, vals]) => ({
    label,
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
  const max = Math.max(...avgs.map(a => a.avg), 1);
  return avgs
    .sort((a, b) => b.avg - a.avg)
    .map(a => ({ ...a, pct: Math.round((a.avg / max) * 100) }));
}

// ── University popularity ────────────────────────────────────────
getUniversityPopularity(): { label: string; count: number; pct: number }[] {
  const map = new Map<string, number>();
  for (const u of this.users) {
    for (const ch of this.getUserUniversityChoices(u)) {
      if (ch.value) map.set(ch.value, (map.get(ch.value) ?? 0) + 1);
    }
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([label, count]) => ({
    label,
    count,
    pct: Math.round((count / max) * 100),
  }));
}

// ── Sign-in sparkline ────────────────────────────────────────────
private _getSignInMonthCounts(): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const u of this.users) {
    const d = u.lastSignIn?.toDate?.() ?? (u.lastSignIn ? new Date(u.lastSignIn) : null);
    if (!d || isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([key, count]) => ({
      label: new Date(key + '-01').toLocaleString('default', { month: 'short' }),
      count,
    }));
}

getSignInMonths(): { label: string }[] {
  return this._getSignInMonthCounts().map(m => ({ label: m.label }));
}

getSparklinePath(): string {
  const data = this._getSignInMonthCounts();
  if (data.length < 2) return '';
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 300, H = 100, pad = 6;
  const xStep = (W - pad * 2) / (data.length - 1);
  return data
    .map((d, i) => {
      const x = pad + i * xStep;
      const y = pad + (1 - d.count / max) * (H - pad * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

getSparklineFillPath(): string {
  const line = this.getSparklinePath();
  if (!line) return '';
  const W = 300, H = 100, pad = 6;
  const data = this._getSignInMonthCounts();
  const xStep = (W - pad * 2) / (data.length - 1);
  const startX = pad;
  const endX   = pad + (data.length - 1) * xStep;
  return `${line} L ${endX.toFixed(1)} ${(H - pad).toFixed(1)} L ${startX.toFixed(1)} ${(H - pad).toFixed(1)} Z`;
}
