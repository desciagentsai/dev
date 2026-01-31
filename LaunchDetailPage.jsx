import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import TradingViewWidget from "../components/TradingViewWidget";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useWalletKit, ConnectButton } from "@mysten/wallet-kit";
import PayListingFeeButton from "@/components/PayListingFeeButton";
import ScrollReveal from "@/components/ScrollReveal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  approved: "bg-emerald-500/15 text-emerald-300",
  live: "bg-sky-500/15 text-sky-300",
  completed: "bg-purple-500/15 text-purple-300",
  pending_review: "bg-amber-500/15 text-amber-300",
  rejected: "bg-rose-500/15 text-rose-300",
};

const formatStatus = (status) => (status ? status.replace(/_/g, " ") : "unknown");

// Placeholder tokenomics data - replace with real data later
const tokenomicsData = {
  totalSupply: 10000000,
  distribution: [
    { name: "Ignition Sale", percentage: 10, color: "#60a5fa" },      // blue-400
    { name: "Wide Liquidity", percentage: 22.5, color: "#3b82f6" },   // blue-500
    { name: "Concentrated Liquidity", percentage: 15, color: "#2563eb" }, // blue-600
    { name: "Treasury", percentage: 45, color: "#1d4ed8" },           // blue-700
    { name: "Bio Protocol Call Option", percentage: 2.5, color: "#1e40af" }, // blue-800
    { name: "veBIO Airdrop", percentage: 5, color: "#38bdf8" },       // sky-400 (cyan accent)
  ],
  releaseSchedule: [
    { name: "Ignition Sale (20% liquid)", color: "#60a5fa" },
    { name: "Wide Liquidity", color: "#3b82f6" },
    { name: "Concentrated Liquidity", color: "#2563eb" },
    { name: "Bio Protocol Call Option", color: "#1e40af" },
    { name: "Ignition Sale (80% vesting)", color: "#22c55e" },
    { name: "Treasury", color: "#6b7280" },
    { name: "veBIO Airdrop", color: "#a855f7" },
  ]
};

const LaunchDetailPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const { isConnected, currentAccount } = useWalletKit();

  const participateRef = useRef(null);
  const twitterRef = useRef(null);

  // Community Sentiment state
  const [upvotes, setUpvotes] = useState(73);
  const [downvotes, setDownvotes] = useState(10);
  const [hasVoted, setHasVoted] = useState(null); // null, 'up', or 'down'

  // Swap mock state
  const [swapFromToken, setSwapFromToken] = useState("SUI");
  const [swapToToken, setSwapToToken] = useState("DESCI");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapSlippage, setSwapSlippage] = useState("0.5");
  const [swapQuote, setSwapQuote] = useState(null);
  const [swapBusy, setSwapBusy] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      setError("");

      try {
      const res = await axios.get(`${backendUrl}/api/launchpad/projects`);
    
      const found = Array.isArray(res.data)
        ? res.data.find((p) => {
            const slugMatch = p.slug === id;
            const symbolMatch =
              typeof p.short_symbol === "string" &&
              typeof id === "string" &&
              p.short_symbol.toLowerCase() === id.toLowerCase();
            const idMatch = String(p.id) === String(id);
            return slugMatch || symbolMatch || idMatch;
          })
        : null;
    
      if (!found) {
        setError("Launch not found.");
        return;
      }
    
      setProject(found);
      
      // Load sentiment votes from project data if available
      if (found.sentiment_upvotes !== undefined) setUpvotes(found.sentiment_upvotes);
      if (found.sentiment_downvotes !== undefined) setDownvotes(found.sentiment_downvotes);
    } catch (err) {
      console.error(err);
      setError("Failed to load launch details.");
    } finally {
  setLoading(false);
      }
      };
      
      fetchProject();
      }, [id]);

  // Load Twitter widgets script
  useEffect(() => {
    if (!window.twttr) {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      script.onload = () => {
        console.log('Twitter widget script loaded successfully');
      };
      document.body.appendChild(script);
    }
  }, []);

  const handleVote = async (voteType) => {
    if (hasVoted === voteType) {
      // Undo vote
      if (voteType === 'up') {
        setUpvotes(prev => prev - 1);
      } else {
        setDownvotes(prev => prev - 1);
      }
      setHasVoted(null);
    } else {
      // Change or new vote
      if (hasVoted === 'up') {
        setUpvotes(prev => prev - 1);
      } else if (hasVoted === 'down') {
        setDownvotes(prev => prev - 1);
      }
      
      if (voteType === 'up') {
        setUpvotes(prev => prev + 1);
      } else {
        setDownvotes(prev => prev + 1);
      }
      setHasVoted(voteType);
    }

    // TODO: Send vote to backend
    try {
      await axios.post(`${backendUrl}/api/launchpad/projects/${project.id}/sentiment`, {
        vote: voteType
      });
    } catch (err) {
      console.error('Failed to record vote:', err);
    }
  };

  const sentimentPercentage = useMemo(() => {
    const total = upvotes + downvotes;
    if (total === 0) return 50;
    return Math.round((upvotes / total) * 100);
  }, [upvotes, downvotes]);

  const requireWallet = () => {
    if (isConnected) return true;

    toast({
      title: "Connect wallet",
      description: "Please connect your Sui wallet to continue.",
    });

    if (participateRef.current) {
      participateRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return false;
  };

  const tokenOptions = useMemo(() => {
    const set = new Set(["SUI", "DESCI"]);
    const a = project?.token_symbol || project?.short_symbol;
    if (a) set.add(String(a).toUpperCase());
    const b = project?.raise_currency;
    if (b) set.add(String(b).toUpperCase());
    return Array.from(set);
  }, [project]);

  const safeExternalUrl = (url) => {
    if (!url) return "#";
    const u = String(url).trim();
    if (!u) return "#";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return `https://${u}`;
  };

  const xUrl = project?.x_url || project?.twitter_url || project?.social_x_url;

  // Twitter widget loader
  useEffect(() => {
    if (!xUrl) return;
    
    const loadTwitterWidget = () => {
      if (window.twttr?.widgets && twitterRef.current) {
        console.log('Loading Twitter widget for:', xUrl);
        
        // Extract username from URL or handle raw username
        let username = xUrl;
        
        // Clean up the username
        if (username.includes('twitter.com/') || username.includes('x.com/')) {
          // Extract username from full URL
          username = username.split('/').pop().replace('@', '').split('?')[0];
        } else {
          // It's already a username, just clean it
          username = username.replace('@', '').replace('https://', '').replace('http://', '').trim();
        }
        
        console.log('Extracted username:', username);
        
        // Build the full Twitter URL
        const fullTwitterUrl = `https://twitter.com/${username}`;
        
        // Use the HTML anchor tag method - more stable and less prone to rate limiting
        twitterRef.current.innerHTML = `
          <a class="twitter-timeline"
             data-theme="dark"
             data-height="600"
             data-chrome="noheader nofooter noborders transparent"
             data-tweet-limit="5"
             data-dnt="true"
             href="${fullTwitterUrl}">
            Loading tweets from @${username}...
          </a>
        `;
        
        // Load the widget
        window.twttr.widgets.load(twitterRef.current).then(() => {
          console.log('✓ Twitter timeline widget loaded for @' + username);
        }).catch((err) => {
          console.error('✗ Error loading Twitter timeline:', err);
          if (twitterRef.current) {
            twitterRef.current.innerHTML = `
              <div class="flex flex-col items-center justify-center p-8 space-y-4 text-center">
                <svg class="w-12 h-12 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <div>
                  <p class="text-slate-400 text-sm mb-2">Twitter feed temporarily unavailable</p>
                  <p class="text-slate-500 text-xs mb-3">This may be due to rate limiting or connectivity issues</p>
                  <a href="${fullTwitterUrl}" target="_blank" rel="noopener noreferrer" 
                     class="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-medium underline">
                    View @${username} on X/Twitter
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                </div>
              </div>
            `;
          }
        });
      } else {
        // Wait for twttr to load
        setTimeout(loadTwitterWidget, 500);
      }
    };

    // Wait a bit for the script to load
    const timer = setTimeout(loadTwitterWidget, 1000);
    return () => clearTimeout(timer);
  }, [xUrl]);

  const getQuote = async () => {
    // Always prompt if not connected (as requested)
    if (!requireWallet()) return;

    setSwapBusy(true);
    setSwapQuote(null);

    try {
      // Placeholder endpoint to hook up later
      const params = new URLSearchParams({
        from: swapFromToken,
        to: swapToToken,
        amount: swapAmount || "0",
        slippage: swapSlippage,
      });

      const res = await axios.get(`${backendUrl}/api/swaps/quote?${params.toString()}`);
      setSwapQuote(res.data || null);
    } catch (err) {
      console.error(err);
      toast({
        title: "Quote unavailable",
        description: "Swap quote endpoint is not connected yet.",
        variant: "destructive",
      });

      // Minimal placeholder so UI still shows something
      setSwapQuote({
        status: "MOCK",
        from: swapFromToken,
        to: swapToToken,
        amount: swapAmount || "0",
        slippage: swapSlippage,
        route: "Best-route placeholder",
        expected_out: "—",
      });
    } finally {
      setSwapBusy(false);
    }
  };

  const executeSwap = async () => {
    if (!requireWallet()) return;

    setSwapBusy(true);
    try {
      // Placeholder endpoint to hook up later
      await axios.post(`${backendUrl}/api/swaps/execute`, {
        from: swapFromToken,
        to: swapToToken,
        amount: swapAmount || "0",
        slippage: swapSlippage,
        walletAddress: currentAccount?.address || null,
      });

      toast({
        title: "Swap submitted",
        description: "Swap execution endpoint is not connected yet.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Swap unavailable",
        description: "Swap execution endpoint is not connected yet.",
        variant: "destructive",
      });
    } finally {
      setSwapBusy(false);
    }
  };

  // Pie chart component for token distribution
  const TokenDistributionChart = () => {
    const size = 200;
    const center = size / 2;
    const radius = 80;
    
    let cumulativePercentage = 0;
    
    const slices = tokenomicsData.distribution.map((item, index) => {
      const startAngle = (cumulativePercentage / 100) * 360;
      cumulativePercentage += item.percentage;
      const endAngle = (cumulativePercentage / 100) * 360;
      
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);
      
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      
      const largeArcFlag = item.percentage > 50 ? 1 : 0;
      
      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      return (
        <path
          key={index}
          d={pathData}
          fill={item.color}
          stroke="#0f172a"
          strokeWidth="2"
          className="transition-opacity hover:opacity-80"
        />
      );
    });
    
    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[280px]">
        <defs>
          <filter id="pieGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#pieGlow)" style={{ transform: 'rotateX(15deg)', transformOrigin: 'center' }}>
          {slices}
        </g>
      </svg>
    );
  };

  // Area chart component for token release schedule
  const TokenReleaseChart = () => {
    const width = 600;
    const height = 300;
    const padding = { top: 40, right: 20, bottom: 40, left: 50 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Simplified release schedule data points (Dec 2025 to Dec 2026)
    const maxTokens = 10;
    
    // Y-axis labels
    const yLabels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="treasuryGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6b7280" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6b7280" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="ignitionVestingGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="wideLiquidityGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="concentratedGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="ignitionLiquidGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="bioProtocolGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1e40af" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="vebioGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        
        {/* Y-axis */}
        <g>
          {yLabels.map((label, i) => {
            const y = padding.top + chartHeight - (label / maxTokens) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400"
                >
                  {label}M
                </text>
              </g>
            );
          })}
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="text-[10px] fill-slate-400"
          >
            TOKENS UNLOCKED
          </text>
        </g>
        
        {/* X-axis labels */}
        <text x={padding.left} y={height - 10} className="text-[10px] fill-slate-400">Dec 2025</text>
        <text x={padding.left + chartWidth} y={height - 10} textAnchor="end" className="text-[10px] fill-slate-400">Dec 2026</text>
        
        {/* Stacked area chart - simplified representation */}
        {/* Layer 7: veBIO Airdrop (top) */}
        <path
          d={`M ${padding.left} ${padding.top + chartHeight * 0.5}
              L ${padding.left + chartWidth * 0.08} ${padding.top + chartHeight * 0.5}
              L ${padding.left + chartWidth * 0.12} ${padding.top + chartHeight * 0.05}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.05}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.1}
              L ${padding.left + chartWidth * 0.12} ${padding.top + chartHeight * 0.1}
              L ${padding.left + chartWidth * 0.08} ${padding.top + chartHeight * 0.55}
              L ${padding.left} ${padding.top + chartHeight * 0.55}
              Z`}
          fill="url(#vebioGradient)"
        />
        
        {/* Layer 6: Treasury */}
        <path
          d={`M ${padding.left} ${padding.top + chartHeight * 0.55}
              L ${padding.left + chartWidth * 0.08} ${padding.top + chartHeight * 0.55}
              L ${padding.left + chartWidth * 0.12} ${padding.top + chartHeight * 0.1}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.1}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.55}
              L ${padding.left + chartWidth * 0.12} ${padding.top + chartHeight * 0.55}
              L ${padding.left + chartWidth * 0.08} ${padding.top + chartHeight * 0.6}
              L ${padding.left} ${padding.top + chartHeight * 0.6}
              Z`}
          fill="url(#treasuryGradient)"
        />
        
        {/* Layer 5: Ignition Sale (80% vesting) */}
        <path
          d={`M ${padding.left} ${padding.top + chartHeight * 0.6}
              L ${padding.left + chartWidth * 0.08} ${padding.top + chartHeight * 0.6}
              L ${padding.left + chartWidth * 0.12} ${padding.top + chartHeight * 0.55}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.55}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.6}
              L ${padding.left + chartWidth * 0.12} ${padding.top + chartHeight * 0.6}
              L ${padding.left + chartWidth * 0.08} ${padding.top + chartHeight * 0.65}
              L ${padding.left} ${padding.top + chartHeight * 0.65}
              Z`}
          fill="url(#ignitionVestingGradient)"
        />
        
        {/* Layer 4: Concentrated Liquidity */}
        <path
          d={`M ${padding.left} ${padding.top + chartHeight * 0.65}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.6}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.75}
              L ${padding.left} ${padding.top + chartHeight * 0.8}
              Z`}
          fill="url(#concentratedGradient)"
        />
        
        {/* Layer 3: Wide Liquidity */}
        <path
          d={`M ${padding.left} ${padding.top + chartHeight * 0.8}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.75}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.85}
              L ${padding.left} ${padding.top + chartHeight * 0.88}
              Z`}
          fill="url(#wideLiquidityGradient)"
        />
        
        {/* Layer 2: Ignition Sale (20% liquid) */}
        <path
          d={`M ${padding.left} ${padding.top + chartHeight * 0.88}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.85}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.92}
              L ${padding.left} ${padding.top + chartHeight * 0.94}
              Z`}
          fill="url(#ignitionLiquidGradient)"
        />
        
        {/* Layer 1: Bio Protocol Call Option (bottom) */}
        <path
          d={`M ${padding.left} ${padding.top + chartHeight * 0.94}
              L ${padding.left + chartWidth} ${padding.top + chartHeight * 0.92}
              L ${padding.left + chartWidth} ${padding.top + chartHeight}
              L ${padding.left} ${padding.top + chartHeight}
              Z`}
          fill="url(#bioProtocolGradient)"
        />
      </svg>
    );
  };

  if (loading) {
    return <p className="text-sm text-slate-300">Loading launch…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  if (!project) {
    return <p className="text-sm text-slate-300">No launch found.</p>;
  }

  const statusClass = statusColors[project.status] || "bg-slate-700 text-slate-200";

  const heroImage = project.card_image_url || project.image_url || project.hero_image_url || null;

  const marketTAM = project?.market_tam || project?.market_tam_usd || project?.tam;
  const perPatientRevenue =
    project?.per_patient_revenue || project?.per_patient_revenue_usd || project?.arpu;
  const patientReach = project?.patient_reach || project?.reach;

  return (
    <section className="space-y-8 text-slate-100" data-testid="launch-detail-page">
      {/* HERO CARD */}
      <Card className="border-slate-800/80 bg-slate-900/70" data-testid="launch-detail-hero-card">
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-[1.3fr,2fr]">
            {/* IMAGE */}
            <div
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
              data-testid="launch-detail-hero-image-wrapper"
            >
              {heroImage && (
                <img
                  src={heroImage}
                  alt={project.name}
                  className="h-full w-full object-cover"
                  data-testid="launch-detail-hero-image"
                />
              )}
            </div>

            {/* META */}
            <div className="flex flex-col justify-between gap-4" data-testid="launch-detail-hero-meta">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge
                    className={`px-2 py-0.5 text-[10px] uppercase ${statusClass}`}
                    data-testid="launch-detail-status-badge"
                  >
                    {formatStatus(project.status)}
                  </Badge>
                </div>

                <div className="relative mb-4 pr-24">
                  <h1
                    className="text-3xl font-semibold tracking-tight text-slate-50"
                    data-testid="launch-detail-title"
                  >
                    {project.name}
                  </h1>

                  {project.logo_url && (
                    <div
                      className="absolute -top-10 right-1 h-16 w-16 overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
                      data-testid="launch-detail-logo-wrapper"
                    >
                      <img
                        src={project.logo_url}
                        alt={`${project.name} logo`}
                        className="h-full w-full object-cover"
                        data-testid="launch-detail-logo-image"
                      />
                    </div>
                  )}
                </div>

                <p className="max-w-xl text-sm text-slate-300" data-testid="launch-detail-description">
                  {project.description}
                </p>

                {/* SOCIALS ROW - Only X */}
                <div
                  className="flex flex-wrap items-center gap-2 pt-1"
                  data-testid="launch-detail-socials-row"
                >
                  <a
                    href={safeExternalUrl(xUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-900/80 hover:text-sky-300 transition-colors"
                    data-testid="launch-detail-social-x"
                    onClick={(e) => {
                      if (!xUrl) e.preventDefault();
                    }}
                  >
                    X
                  </a>
                </div>
              </div>

              {/*  where the old logo used to be */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LOWER GRID WITH COMMUNITY SENTIMENT */}
      <div className="grid gap-6 md:grid-cols-[2fr,1.2fr]">
        <div className="space-y-6">
          {/* COMMUNITY SENTIMENT */}
          <ScrollReveal>
            <Card className="border-slate-800/80 bg-slate-900/70" data-testid="launch-detail-sentiment-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-100">
                  Community Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">How do you feel about this ipt?</p>
                  <Badge className="bg-sky-500/15 text-sky-300 px-3 py-1 text-xs font-semibold">
                    {sentimentPercentage}% POSITIVE
                  </Badge>
                </div>

                {/* VOTING BUTTONS */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleVote('up')}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                      hasVoted === 'up'
                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10'
                    }`}
                    data-testid="launch-detail-sentiment-upvote"
                  >
                    <span className="text-emerald-400">&uarr;</span>
                    <span>{upvotes}</span>
                  </button>

                  <button
                    onClick={() => handleVote('down')}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                      hasVoted === 'down'
                        ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-rose-500/40 hover:bg-rose-500/10'
                    }`}
                    data-testid="launch-detail-sentiment-downvote"
                  >
                    <span className="text-rose-400">&darr;</span>
                    <span>{downvotes}</span>
                  </button>

                  {/* SENTIMENT CHART */}
                  <div className="ml-auto flex-1">
                    <div className="relative h-16 w-full">
                      <svg viewBox="0 0 200 60" className="w-full h-full">
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="sentimentGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        
                        {/* Simple trending line */}
                        <path
                          d="M 0 50 Q 50 45, 100 30 T 200 15"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          className="drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                        />
                        
                        {/* Area under the line */}
                        <path
                          d="M 0 50 Q 50 45, 100 30 T 200 15 L 200 60 L 0 60 Z"
                          fill="url(#sentimentGradient)"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* RAISE DETAILS */}
          <ScrollReveal delayMs={100}>
            <Card className="border-slate-800/80 bg-slate-900/70" data-testid="launch-detail-raise-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-100">
                  Raise details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-slate-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-slate-400">Raise Currency</p>
                    <p data-testid="launch-detail-raise-currency">{project.raise_currency}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Hard Cap</p>
                    <p data-testid="launch-detail-hard-cap">{project.hard_cap}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Soft Cap</p>
                    <p data-testid="launch-detail-soft-cap">{project.soft_cap}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Ticket Size</p>
                    <p data-testid="launch-detail-ticket-range">
                      {project.min_contribution} – {project.max_contribution}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Price / Token</p>
                    <p data-testid="launch-detail-price-per-token">{project.price_per_token}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Token Symbol</p>
                    <p data-testid="launch-detail-token-symbol">{project.token_symbol}</p>
                  </div>
                </div>

                <div>
                  {/* PROGRESS LABEL */}
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Progress (off-chain placeholder)</span>
                    <span data-testid="launch-detail-progress-label">
                      {Number(project.progress_percent) || 0}% funded
                    </span>
                  </div>

                  {/* CUSTOM CYAN PROGRESS BAR */}
                  <div
                    className="relative h-2 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: "#1f2933" }} // dark track
                    data-testid="launch-detail-progress-track"
                  >
                    {/* Filled portion */}
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(Number(project.progress_percent) || 0, 100)}%`,
                        backgroundColor: "#38bdf8", // SAME cyan as button (sky-400)
                      }}
                      data-testid="launch-detail-progress-fill"
                    />

                    {/* 100% end marker */}
                    <div
                      className="absolute right-0 top-0 h-full"
                      style={{
                        width: "2px",
                        backgroundColor: "rgba(255,255,255,0.7)",
                      }}
                      data-testid="launch-detail-progress-end-marker"
                    />
                  </div>
                </div>

                <div className="space-y-3 text-[11px]">
                  {project.project_token_address && (
                    <div>
                      <p className="text-slate-400">Project Token Address</p>
                      <p className="break-all text-slate-200" data-testid="launch-detail-project-token-address">
                        {project.project_token_address}
                      </p>
                    </div>
                  )}
                  {project.sui_raise_address && (
                    <div>
                      <p className="text-slate-400">SUI Raise Object / Address</p>
                      <p className="break-all text-slate-200" data-testid="launch-detail-sui-raise-address">
                        {project.sui_raise_address}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        {/* PARTICIPATE */}
        <ScrollReveal delayMs={200}>
          <Card
            className="border-slate-800/80 bg-slate-900/70"
            data-testid="launch-detail-participate-card"
            ref={participateRef}
          >
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-100">
                Participate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-slate-300">
              {!isConnected ? (
                <>
                  <p data-testid="launch-detail-wallet-disconnected-text">
                    Connect a Sui wallet to prepare for contributions. This demo uses a mock wallet
                    connection.
                  </p>
                  <ConnectButton
                    className="w-full rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold uppercase text-slate-950 hover:bg-sky-400"
                    data-testid="launch-detail-connect-wallet-button"
                  >
                    Connect SUI Wallet
                  </ConnectButton>
                </>
              ) : (
                <>
                  <p data-testid="launch-detail-wallet-connected-text">
                    Connected as{" "}
                    <span className="break-all font-mono text-sky-300" data-testid="launch-detail-wallet-address">
                      {currentAccount?.address}
                    </span>
                  </p>
                  <Button
                    variant="outline"
                    disabled
                    className="w-full rounded-full border-slate-600 bg-slate-950/80 text-xs font-semibold uppercase text-slate-100 hover:bg-slate-800/80"
                    data-testid="launch-detail-disconnect-wallet-button"
                  >
                    Disconnect wallet
                  </Button>
                </>
              )}

              {/* SWAP (MOCK) */}
              <div
                className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4"
                data-testid="launch-detail-swap-mock-box"
                onMouseDown={() => {
                  // prompt quickly on interaction
                  requireWallet();
                }}
              >
                <div
                  className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                  data-testid="launch-detail-swap-mock-title"
                >
                  Swap (Mock)
                </div>

                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400" data-testid="launch-detail-swap-from-label">
                        From
                      </label>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 text-xs text-slate-200 outline-none focus:border-sky-500/60"
                        value={swapFromToken}
                        onChange={(e) => setSwapFromToken(e.target.value)}
                        onFocus={() => requireWallet()}
                        data-testid="launch-detail-swap-from-select"
                      >
                        {tokenOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400" data-testid="launch-detail-swap-to-label">
                        To
                      </label>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 text-xs text-slate-200 outline-none focus:border-sky-500/60"
                        value={swapToToken}
                        onChange={(e) => setSwapToToken(e.target.value)}
                        onFocus={() => requireWallet()}
                        data-testid="launch-detail-swap-to-select"
                      >
                        {tokenOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400" data-testid="launch-detail-swap-amount-label">
                        Amount
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
                        value={swapAmount}
                        onChange={(e) => setSwapAmount(e.target.value)}
                        onFocus={() => requireWallet()}
                        placeholder="0.0"
                        data-testid="launch-detail-swap-amount-input"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400" data-testid="launch-detail-swap-slippage-label">
                        Slippage
                      </label>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 text-xs text-slate-200 outline-none focus:border-sky-500/60"
                        value={swapSlippage}
                        onChange={(e) => setSwapSlippage(e.target.value)}
                        onFocus={() => requireWallet()}
                        data-testid="launch-detail-swap-slippage-select"
                      >
                        <option value="0.1">0.1%</option>
                        <option value="0.5">0.5%</option>
                        <option value="1.0">1.0%</option>
                        <option value="2.0">2.0%</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="flex-1 rounded-full bg-slate-800 px-4 text-[11px] font-semibold uppercase tracking-wide text-slate-100 hover:bg-slate-700"
                      onClick={getQuote}
                      disabled={swapBusy}
                      data-testid="launch-detail-swap-get-quote-button"
                    >
                      {swapBusy ? "Loading..." : "Get Quote"}
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 rounded-full bg-sky-500 px-4 text-[11px] font-semibold uppercase tracking-wide text-slate-950 hover:bg-sky-400"
                      onClick={executeSwap}
                      disabled={swapBusy}
                      data-testid="launch-detail-swap-execute-button"
                    >
                      {swapBusy ? "Working..." : "Swap"}
                    </Button>
                  </div>

                  <div
                    className="rounded-lg border border-slate-800/80 bg-slate-950/80 p-3 text-[11px] text-slate-300"
                    data-testid="launch-detail-swap-quote-preview"
                  >
                    {swapQuote ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Status</span>
                          <span className="text-slate-200">{swapQuote.status || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Route</span>
                          <span className="text-slate-200">{swapQuote.route || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Expected out</span>
                          <span className="text-slate-200">{swapQuote.expected_out || "—"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400">
                        Quote preview will appear here. (Endpoints can be connected later.)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      {/* FULL-WIDTH TABS SECTION - Now with 5 tabs: About, Team, Research Hypothesis, Value Capture Model, Roadmap */}
      <ScrollReveal delayMs={300}>
        <Card className="border-slate-800/80 bg-slate-900/70" data-testid="launch-detail-tabs-card">
          <CardContent className="p-0">
            <Tabs defaultValue="about" data-testid="launch-detail-tabs">
              <div className="border-b border-slate-800/80 px-6 py-4">
                <TabsList
                  className="bg-slate-950/60 text-slate-300"
                  data-testid="launch-detail-tabs-list"
                >
                  <TabsTrigger
                    value="about"
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50"
                    data-testid="launch-detail-tab-about"
                  >
                    About
                  </TabsTrigger>
                  <TabsTrigger
                    value="team"
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50"
                    data-testid="launch-detail-tab-team"
                  >
                    Team
                  </TabsTrigger>
                  <TabsTrigger
                    value="research"
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50"
                    data-testid="launch-detail-tab-research"
                  >
                    Research Hypothesis
                  </TabsTrigger>
                  <TabsTrigger
                    value="value-capture"
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50"
                    data-testid="launch-detail-tab-value-capture"
                  >
                    Value Capture Model
                  </TabsTrigger>
                  <TabsTrigger
                    value="roadmap"
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50"
                    data-testid="launch-detail-tab-roadmap"
                  >
                    Roadmap
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="px-6 py-6">
                {/* ABOUT TAB - Now includes Market Overview */}
                <TabsContent value="about" data-testid="launch-detail-tab-content-about">
                  <div className="space-y-4 text-sm text-slate-300">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        About the project
                      </div>
                      <p className="text-slate-300">{project.description}</p>
                    </div>

                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Key details
                      </div>
                      <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] text-slate-400">Status</p>
                          <p className="text-slate-200">{formatStatus(project.status)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Token</p>
                          <p className="text-slate-200">{project.token_symbol || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Raise currency</p>
                          <p className="text-slate-200">{project.raise_currency || "—"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Market Overview - Moved from Research Hypothesis */}
                    <div
                      className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4"
                      data-testid="launch-detail-market-overview-card"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Market Overview
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
                          <div className="text-2xl font-semibold text-slate-50" data-testid="launch-detail-market-tam">
                            {marketTAM || "—"}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            Total addressable market
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
                          <div
                            className="text-2xl font-semibold text-slate-50"
                            data-testid="launch-detail-market-per-patient-revenue"
                          >
                            {perPatientRevenue || "—"}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            Revenue / value capture per patient
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
                          <div className="text-2xl font-semibold text-slate-50" data-testid="launch-detail-market-reach">
                            {patientReach || "—"}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            Patient reach / adoption
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TEAM TAB */}
                <TabsContent value="team" data-testid="launch-detail-tab-content-team">
                  <div className="space-y-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Team
                    </div>

                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 text-sm text-slate-300">
                      <p data-testid="launch-detail-team-placeholder">
                        Team details can be connected later.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* RESEARCH HYPOTHESIS TAB - Without Market Overview, Value Capture, Roadmap */}
                <TabsContent value="research" data-testid="launch-detail-tab-content-research">
                  <div className="space-y-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Research hypothesis
                    </div>

                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 text-sm text-slate-300">
                      <p data-testid="launch-detail-hypothesis-placeholder">
                        Research hypothesis content can be connected later.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 text-sm text-slate-300">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Problem / Approach
                      </div>
                      <p className="mt-2" data-testid="launch-detail-problem-approach-placeholder">
                        Add structured sections here (summary, problems, impact, methodology).
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* VALUE CAPTURE MODEL TAB - Now its own tab */}
                <TabsContent value="value-capture" data-testid="launch-detail-tab-content-value-capture">
                  <div className="space-y-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Value Capture Model
                    </div>

                    <div
                      className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4"
                      data-testid="launch-detail-value-capture-card"
                    >
                      <ul className="space-y-2 text-sm text-slate-300" data-testid="launch-detail-value-capture-list">
                        <li>• Token utility + protocol fees (placeholder)</li>
                        <li>• Licensing / partnership revenue (placeholder)</li>
                        <li>• Community incentives & governance (placeholder)</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                {/* ROADMAP TAB - Now its own tab */}
                <TabsContent value="roadmap" data-testid="launch-detail-tab-content-roadmap">
                  <div className="space-y-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Roadmap
                    </div>

                    <div
                      className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4"
                      data-testid="launch-detail-roadmap-card"
                    >
                      <ul className="space-y-2 text-sm text-slate-300" data-testid="launch-detail-roadmap-list">
                        <li>• Milestone 1 (placeholder)</li>
                        <li>• Milestone 2 (placeholder)</li>
                        <li>• Milestone 3 (placeholder)</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* TOKENOMICS SECTION - New section with Token Distribution and Token Release Schedule */}
      <ScrollReveal delayMs={350}>
        <Card className="border-slate-800/80 bg-slate-900/70" data-testid="launch-detail-tokenomics-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-100">
              Tokenomics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="distribution" data-testid="launch-detail-tokenomics-tabs">
              <div className="border-b border-slate-800/80 px-6 py-4">
                <TabsList
                  className="bg-slate-950/60 text-slate-300"
                  data-testid="launch-detail-tokenomics-tabs-list"
                >
                  <TabsTrigger
                    value="distribution"
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50"
                    data-testid="launch-detail-tokenomics-tab-distribution"
                  >
                    Token Distribution
                  </TabsTrigger>
                  <TabsTrigger
                    value="release"
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50"
                    data-testid="launch-detail-tokenomics-tab-release"
                  >
                    Token Release Schedule
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="px-6 py-6">
                {/* TOKEN DISTRIBUTION TAB */}
                <TabsContent value="distribution" data-testid="launch-detail-tokenomics-content-distribution">
                  <div className="grid gap-6 md:grid-cols-[1fr,1.2fr]">
                    {/* PIE CHART */}
                    <div className="flex items-center justify-center">
                      <TokenDistributionChart />
                    </div>

                    {/* LEGEND & TOTAL SUPPLY */}
                    <div className="space-y-4">
                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
                        <div className="text-2xl font-semibold text-slate-50" data-testid="launch-detail-total-supply">
                          {tokenomicsData.totalSupply.toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-sky-400">
                          Total Supply
                        </div>
                      </div>

                      <div className="space-y-3">
                        {tokenomicsData.distribution.map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm text-slate-300">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-200">{item.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TOKEN RELEASE SCHEDULE TAB */}
                <TabsContent value="release" data-testid="launch-detail-tokenomics-content-release">
                  <div className="space-y-4">
                    {/* LEGEND */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px]">
                      {tokenomicsData.releaseSchedule.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-slate-300">{item.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* AREA CHART */}
                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
                      <TokenReleaseChart />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* SOCIAL FEED SECTION - Only X feed */}
      <ScrollReveal delayMs={400}>
        <section>
          <Card className="border-slate-800/80 bg-slate-900/70" data-testid="launch-detail-social-feed-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-100">
                Social Feed
              </CardTitle>
            </CardHeader>

            <CardContent>
              {/* X Feed - No accordion, direct display */}
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  X Feed
                </div>

                {/* X Timeline Embed - Using project's twitter_url from database */}
                <div 
                  className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4"
                  data-testid="launch-detail-social-feed-x-embed"
                >
                  {xUrl ? (
                    <div ref={twitterRef} className="min-h-[400px]">
                      {/* Twitter widget will be loaded here by the useEffect hook */}
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-slate-400">
                      <p>No X/Twitter URL available for this project.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </ScrollReveal>
    </section> 
  );
};

export default LaunchDetailPage;
