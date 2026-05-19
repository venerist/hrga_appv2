'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/ui'
import {
  Shield, Zap, Users, BarChart3, Clock, Globe, CheckCircle, ArrowRight,
  Fingerprint, Lock, Database, ChevronRight, Star, ArrowUpRight, Activity
} from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-surface text-dark font-sans relative overflow-hidden">
      {/* ─── Background Effects ─── */}
      <div className="absolute inset-0 gradient-mesh opacity-80" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 blur-[120px] rounded-full mix-blend-multiply pointer-events-none" />

      {/* ─── Navbar ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-border shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
          <AppLogo size="md" variant="dark" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted hover:text-primary transition-colors font-semibold">Features</a>
            <a href="#security" className="text-sm text-muted hover:text-primary transition-colors font-semibold">Security</a>
            <a href="#pricing" className="text-sm text-muted hover:text-primary transition-colors font-semibold">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/login')} className="hidden sm:block text-sm font-semibold text-muted hover:text-dark transition-colors cursor-pointer">Sign In</button>
            <button onClick={() => router.push('/login')} className="btn-primary text-sm !py-2.5 !px-5 !rounded-full shadow-lg shadow-primary/20">
              Get Started <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-xs font-semibold text-primary mb-8 animate-fade-in-down shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Enterprise HR Intelligence
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.15] animate-fade-in-up font-display text-dark">
            Modernize Your <br className="hidden md:block" />
            <span className="gradient-text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Workforce Operations
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-2">
            The premium HRIS platform designed for Indonesian enterprises. Manage attendance, payroll, recruitment, and KPI seamlessly in one beautiful interface.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in-up delay-3">
            <button onClick={() => router.push('/login')} className="btn-primary text-base !py-3.5 !px-8 !rounded-full shadow-xl shadow-primary/20 hover:-translate-y-1">
              Start Free Trial <ArrowRight size={16} />
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="btn-secondary text-base !py-3.5 !px-8 !rounded-full hover:-translate-y-1 bg-white">
              Explore Features
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-xl mx-auto mt-20 animate-fade-in-up delay-4 pt-10 border-t border-border">
            <StatItem value="500+" label="Enterprise Clients" />
            <StatItem value="50K+" label="Active Employees" />
            <StatItem value="99.9%" label="Uptime SLA" />
          </div>
        </div>
      </section>

      {/* ─── Dashboard Preview ─── */}
      <section className="relative px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-2xl md:rounded-[2rem] bg-white border border-border shadow-[0_20px_80px_rgba(249,115,22,0.07)] p-2 animate-fade-in-up delay-5 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative rounded-xl md:rounded-[1.5rem] bg-surface-alt p-4 md:p-8 flex flex-col md:flex-row gap-6 items-center">
               <div className="flex-1 space-y-4 w-full">
                 <div className="h-8 w-1/3 bg-border-light rounded-lg mb-8" />
                 <div className="grid grid-cols-2 gap-4">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-border-light flex flex-col gap-2">
                       <div className="h-4 w-16 bg-primary/10 rounded" />
                       <div className="h-6 w-10 bg-dark/10 rounded" />
                     </div>
                   ))}
                 </div>
                 <div className="h-40 w-full bg-white rounded-xl shadow-sm border border-border-light mt-4" />
               </div>
               <div className="w-full md:w-1/3 space-y-4">
                  <div className="h-24 w-full bg-white rounded-xl shadow-sm border border-border-light p-4 flex gap-4 items-center">
                    <div className="h-10 w-10 bg-secondary/10 rounded-full" />
                    <div className="flex-1 space-y-2"><div className="h-3 w-1/2 bg-dark/10 rounded" /><div className="h-2 w-1/3 bg-muted/20 rounded" /></div>
                  </div>
                  <div className="h-24 w-full bg-white rounded-xl shadow-sm border border-border-light p-4 flex gap-4 items-center">
                    <div className="h-10 w-10 bg-accent/10 rounded-full" />
                    <div className="flex-1 space-y-2"><div className="h-3 w-1/2 bg-dark/10 rounded" /><div className="h-2 w-1/3 bg-muted/20 rounded" /></div>
                  </div>
                  <div className="h-24 w-full bg-white rounded-xl shadow-sm border border-border-light p-4 flex gap-4 items-center">
                    <div className="h-10 w-10 bg-primary/10 rounded-full" />
                    <div className="flex-1 space-y-2"><div className="h-3 w-1/2 bg-dark/10 rounded" /><div className="h-2 w-1/3 bg-muted/20 rounded" /></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 bg-surface-alt/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary-700 text-xs font-semibold mb-4 border border-secondary/20">
              <Activity size={12} /> Comprehensive Suite
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display text-dark">
              Everything you need for <span className="text-primary">HR Excellence</span>
            </h2>
            <p className="mt-4 text-muted text-lg">
              A unified ecosystem replacing fragmented tools. Automate workflows, empower employees, and gain actionable insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard icon={<Fingerprint size={24} />} title="Biometric & GPS Tracking" desc="Seamless attendance verification via mobile GPS or integrated fingerprint machines." color="primary" />
            <FeatureCard icon={<Users size={24} />} title="Talent Acquisition" desc="Visual recruitment pipelines from sourcing to automated onboarding sequences." color="accent" />
            <FeatureCard icon={<Clock size={24} />} title="Leave & Absence" desc="Self-service portal for leave requests with multi-tier approval workflows." color="primary" />
            <FeatureCard icon={<Star size={24} />} title="Performance Management" desc="Set OKRs, track KPIs, and conduct comprehensive 360-degree performance reviews." color="secondary" />
          </div>
        </div>
      </section>

      {/* ─── Security ─── */}
      <section id="security" className="py-24 relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary-700 text-xs font-semibold border border-primary/20">
                <Shield size={12} /> Bank-Grade Security
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display text-dark leading-tight">
                Your data security is our <span className="text-primary">top priority</span>.
              </h2>
              <p className="text-muted text-lg leading-relaxed">
                We've built Veneris HR on a hardened infrastructure utilizing modern security paradigms. Sleep peacefully knowing your sensitive HR data is protected by enterprise-grade encryption and access controls.
              </p>
              
              <ul className="space-y-4">
                {[
                  { title: "Row Level Security (RLS)", desc: "PostgreSQL-level policies ensure users only access authorized data." },
                  { title: "Server-Side Authentication", desc: "HTTP-only cookies protect against XSS and token hijacking." },
                  { title: "End-to-End Encryption", desc: "Data is encrypted in transit (TLS 1.3) and at rest (AES-256)." }
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <div className="mt-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle size={14} className="text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-dark">{item.title}</h4>
                      <p className="text-sm text-muted">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl transform rotate-3 scale-105" />
              <div className="relative bg-white border border-border shadow-xl rounded-3xl p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="font-bold text-dark flex items-center gap-2"><Lock size={18} className="text-primary"/> Security Audit</div>
                  <span className="text-ok text-xs font-bold bg-ok/10 px-2 py-1 rounded">100% Passed</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-sm font-medium text-dark">Data Encryption</span><div className="h-2 w-24 bg-primary rounded-full"/></div>
                  <div className="flex justify-between items-center"><span className="text-sm font-medium text-dark">Access Control</span><div className="h-2 w-24 bg-primary rounded-full"/></div>
                  <div className="flex justify-between items-center"><span className="text-sm font-medium text-dark">Vulnerability Scanning</span><div className="h-2 w-24 bg-primary rounded-full"/></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-surface-alt border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <AppLogo size="sm" variant="dark" showTagline={false} />
             <p className="text-sm text-muted font-medium ml-2 border-l border-border pl-4">Enterprise Workforce Intelligence</p>
          </div>
          <p className="text-xs text-muted">© 2026 Veneris HR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-extrabold text-primary font-display">{value}</div>
      <div className="text-sm font-semibold text-dark mt-1">{label}</div>
    </div>
  )
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary-600 border-primary/10 group-hover:bg-primary group-hover:text-white',
    secondary: 'bg-secondary/10 text-secondary-600 border-secondary/10 group-hover:bg-secondary group-hover:text-white',
    accent: 'bg-accent/10 text-accent-600 border-accent/10 group-hover:bg-accent group-hover:text-white',
  }
  return (
    <div className="group bg-white border border-border shadow-sm hover:shadow-lg rounded-[1.5rem] p-8 transition-all duration-300 hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 border ${colorMap[color]}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-dark mb-3">{title}</h3>
      <p className="text-muted leading-relaxed">{desc}</p>
    </div>
  )
}
