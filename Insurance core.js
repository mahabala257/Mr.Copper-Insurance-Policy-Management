
const PolicyType   = { HEALTH: "Health", VEHICLE: "Vehicle", LIFE: "Life" };
const PolicyStatus = { ACTIVE: "Active", LAPSED: "Lapsed", SURRENDERED: "Surrendered", PENDING: "Pending", EXPIRED: "Expired" };
const ClaimStatus  = { SUBMITTED: "Submitted", UNDER_REVIEW: "Under Review", APPROVED: "Approved", REJECTED: "Rejected", SETTLED: "Settled" };
const PremiumStatus = { PENDING: "Pending", PAID: "Paid", OVERDUE: "Overdue", GRACE: "Grace Period" };


class Policy {
  constructor({ policyNumber, holderId, type, coverageAmount, premium, startDate, endDate }) {
    this.policyNumber   = policyNumber;
    this.holderId       = holderId;
    this.type           = type;          
    this.coverageAmount = coverageAmount; 
    this.premium        = premium;        
    this.startDate      = new Date(startDate);
    this.endDate        = new Date(endDate);
    this.status         = PolicyStatus.PENDING;
    this.createdAt      = new Date();
    this.history        = [];
  }

  _log(action) {
    this.history.push({ action, timestamp: new Date().toISOString() });
  }

  activate() {
    if (this.status !== PolicyStatus.PENDING)
      throw new Error(`Cannot activate a policy in '${this.status}' state.`);
    this.status = PolicyStatus.ACTIVE;
    this._log("Policy Activated");
    return this;
  }

  lapse() {
    if (this.status !== PolicyStatus.ACTIVE)
      throw new Error("Only active policies can lapse.");
    this.status = PolicyStatus.LAPSED;
    this._log("Policy Lapsed due to non-payment");
    return this;
  }

  renew(newEndDate) {
    if (![PolicyStatus.ACTIVE, PolicyStatus.LAPSED, PolicyStatus.EXPIRED].includes(this.status))
      throw new Error("Policy is not eligible for renewal.");
    this.endDate = new Date(newEndDate);
    this.status  = PolicyStatus.ACTIVE;
    this._log(`Policy Renewed until ${newEndDate}`);
    return this;
  }

  surrender() {
    if (this.status !== PolicyStatus.ACTIVE)
      throw new Error("Only active policies can be surrendered.");
    this.status = PolicyStatus.SURRENDERED;
    this._log("Policy Surrendered by policyholder");
    return this;
  }

  isExpired() {
    return new Date() > this.endDate;
  }
}

class Claim {
  constructor({ claimId, policyNumber, incidentDate, amount, description = "" }) {
    this.claimId       = claimId;
    this.policyNumber  = policyNumber;
    this.incidentDate  = new Date(incidentDate);
    this.amount        = amount;          // claimed amount
    this.description   = description;
    this.status        = ClaimStatus.SUBMITTED;
    this.adjusterNotes = "";
    this.settlement    = null;
    this.submittedAt   = new Date();
    this.history       = [];
  }

  _log(action) {
    this.history.push({ action, timestamp: new Date().toISOString() });
  }

  submit() {
    this.status = ClaimStatus.SUBMITTED;
    this._log("Claim submitted");
    return this;
  }

  approve(adjusterNotes = "") {
    if (this.status !== ClaimStatus.UNDER_REVIEW)
      throw new Error("Claim must be under review before approval.");
    this.status        = ClaimStatus.APPROVED;
    this.adjusterNotes = adjusterNotes;
    this.settlement    = this.calculateSettlement();
    this._log(`Claim approved. Settlement: ₹${this.settlement}`);
    return this;
  }

  reject(adjusterNotes = "") {
    if (this.status !== ClaimStatus.UNDER_REVIEW)
      throw new Error("Claim must be under review before rejection.");
    this.status        = ClaimStatus.REJECTED;
    this.adjusterNotes = adjusterNotes;
    this.settlement    = 0;
    this._log(`Claim rejected. Reason: ${adjusterNotes}`);
    return this;
  }

  calculateSettlement(deductibleRate = 0.15) {
    return parseFloat((this.amount * (1 - deductibleRate)).toFixed(2));
  }

  markUnderReview() {
    this.status = ClaimStatus.UNDER_REVIEW;
    this._log("Claim moved to Under Review");
    return this;
  }
}

class Premium {
  constructor({ premiumId, policyNumber, dueDate, amount }) {
    this.premiumId    = premiumId;
    this.policyNumber = policyNumber;
    this.dueDate      = new Date(dueDate);
    this.amount       = amount;
    this.status       = PremiumStatus.PENDING;
    this.paidAt       = null;
    this.history      = [];
  }

  _log(action) {
    this.history.push({ action, timestamp: new Date().toISOString() });
  }

  pay() {
    if (this.status === PremiumStatus.PAID)
      throw new Error("Premium already paid.");
    this.status = PremiumStatus.PAID;
    this.paidAt = new Date();
    this._log(`Payment of ₹${this.amount} received`);
    return this;
  }

  markOverdue() {
    if (this.status === PremiumStatus.PAID)
      throw new Error("Cannot mark a paid premium as overdue.");
    this.status = PremiumStatus.OVERDUE;
    this._log("Premium marked overdue");
    return this;
  }

  applyGracePeriod(days = 30) {
    if (this.status !== PremiumStatus.OVERDUE)
      throw new Error("Grace period applies only to overdue premiums.");
    this.status  = PremiumStatus.GRACE;
    const grace  = new Date(this.dueDate);
    grace.setDate(grace.getDate() + days);
    this.graceEndDate = grace;
    this._log(`Grace period of ${days} days applied. Ends: ${grace.toDateString()}`);
    return this;
  }
}

class Underwriter {
  constructor(name) {
    this.underwriterName = name;
    this.decisions       = [];
  }

  assessRisk(policy) {
    let score = 50; // baseline
    if (policy.type === PolicyType.LIFE)    score += 20;
    if (policy.type === PolicyType.HEALTH)  score += 10;
    if (policy.coverageAmount > 1000000)    score += 15;
    if (policy.coverageAmount > 5000000)    score += 10;
    const ageOfHolder = Math.floor(Math.random() * 30) + 25; 
    if (ageOfHolder > 50) score += 10;
    const recommendation = score < 70 ? "Low Risk — Approve" : score < 85 ? "Medium Risk — Review" : "High Risk — Reject";
    return { score: Math.min(score, 100), recommendation, assessedBy: this.underwriterName };
  }

  approve(policy, notes = "") {
    policy.activate();
    const decision = { action: "Approved", policyNumber: policy.policyNumber, notes, by: this.underwriterName, at: new Date().toISOString() };
    this.decisions.push(decision);
    return decision;
  }

  reject(policy, reason = "") {
    policy.status = PolicyStatus.SURRENDERED; 
    const decision = { action: "Rejected", policyNumber: policy.policyNumber, reason, by: this.underwriterName, at: new Date().toISOString() };
    this.decisions.push(decision);
    return decision;
  }
}

class InsuranceStore {
  constructor() {
    this.policies    = new Map();
    this.claims      = new Map();
    this.premiums    = new Map();
    this.holders     = new Map();
    this.underwriters = new Map();
    this._counters   = { policy: 1, claim: 1, premium: 1 };
  }

  addHolder(holder) { this.holders.set(holder.id, holder); return holder; }
  getHolder(id)     { return this.holders.get(id); }
  allHolders()      { return [...this.holders.values()]; }

  addPolicy(data) {
    const p = new Policy({ policyNumber: `POL-${String(this._counters.policy++).padStart(4,"0")}`, ...data });
    this.policies.set(p.policyNumber, p);
    return p;
  }
  getPolicy(num) { return this.policies.get(num); }
  allPolicies()  { return [...this.policies.values()]; }

  addClaim(data) {
    const c = new Claim({ claimId: `CLM-${String(this._counters.claim++).padStart(4,"0")}`, ...data });
    this.claims.set(c.claimId, c);
    return c;
  }
  getClaim(id)   { return this.claims.get(id); }
  allClaims()    { return [...this.claims.values()]; }
  claimsFor(policyNumber) { return this.allClaims().filter(c => c.policyNumber === policyNumber); }

  addPremium(data) {
    const pr = new Premium({ premiumId: `PRM-${String(this._counters.premium++).padStart(4,"0")}`, ...data });
    this.premiums.set(pr.premiumId, pr);
    return pr;
  }
  getPremium(id)   { return this.premiums.get(id); }
  allPremiums()    { return [...this.premiums.values()]; }
  premiumsFor(policyNumber) { return this.allPremiums().filter(p => p.policyNumber === policyNumber); }

  stats() {
    const policies  = this.allPolicies();
    const claims    = this.allClaims();
    const premiums  = this.allPremiums();
    return {
      totalPolicies:   policies.length,
      activePolicies:  policies.filter(p => p.status === PolicyStatus.ACTIVE).length,
      totalClaims:     claims.length,
      pendingClaims:   claims.filter(c => [ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW].includes(c.status)).length,
      settledAmount:   claims.filter(c => c.settlement).reduce((a,c) => a + (c.settlement||0), 0),
      premiumCollected:premiums.filter(p => p.status === PremiumStatus.PAID).reduce((a,p) => a + p.amount, 0),
      overdueCount:    premiums.filter(p => p.status === PremiumStatus.OVERDUE).length,
    };
  }
}




if (typeof module !== "undefined") {
  module.exports = { Policy, Claim, Premium, Underwriter, InsuranceStore, seedStore, PolicyType, PolicyStatus, ClaimStatus, PremiumStatus };
} else {
  window.InsuranceCore = { Policy, Claim, Premium, Underwriter, InsuranceStore, seedStore, PolicyType, PolicyStatus, ClaimStatus, PremiumStatus };
}