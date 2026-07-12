import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const MOCK_PHOTOS = [
  { id: 'mock-1', title: 'Romantic Garden Wedding', category: 'wedding', image_url: '/mockups/mockup_wedding.png' },
  { id: 'mock-2', title: 'Summer Breeze Portrait', category: 'portrait', image_url: '/mockups/mockup_portrait.png' },
  { id: 'mock-3', title: 'Neon Night Live Concert', category: 'event', image_url: '/mockups/mockup_event.png' },
  { id: 'mock-4', title: 'Class of 2026 Celebration', category: 'graduation', image_url: '/mockups/mockup_graduation.png' }
];

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [settings, setSettings] = useState({});
  const [bookedDates, setBookedDates] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log("VITE_GOOGLE_CLIENT_ID loaded:", import.meta.env.VITE_GOOGLE_CLIENT_ID);


  // Filter category state
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Selected photo for fullscreen view
  const [activePhoto, setActivePhoto] = useState(null);

  // Client Authentication State
  const [clientUser, setClientUser] = useState(
    JSON.parse(localStorage.getItem('client_google_user') || 'null')
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // Booking Form State (Mirrors Manager Form without Price fields)
  const [bookingClientName, setBookingClientName] = useState('');
  const [bookingContact, setBookingContact] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingJobType, setBookingJobType] = useState('wedding');
  const [bookingStartTime, setBookingStartTime] = useState('');
  const [bookingEndTime, setBookingEndTime] = useState('');
  const [bookingLocation, setBookingLocation] = useState('');
  const [bookingDetails, setBookingDetails] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Tracking State
  const [trackingCode, setTrackingCode] = useState('');
  const [trackedJob, setTrackedJob] = useState(null);
  const [trackingError, setTrackingError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Client Jobs Sync State
  const [clientJobs, setClientJobs] = useState([]);
  const [clientJobsLoading, setClientJobsLoading] = useState(false);
  const [clientJobsError, setClientJobsError] = useState('');


  // Slip verification state
  const [slipImage, setSlipImage] = useState('');
  const [verifyingSlip, setVerifyingSlip] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Navigation tab state
  const [activePage, setActivePage] = useState('gallery'); // 'gallery' | 'pricing' | 'book' | 'track'

  // Ref for auto-scrolling to tracked job result (e.g. from email link)
  const trackResultRef = useRef(null);

  const getPackagesList = () => {
    try {
      if (settings.packages) {
        return JSON.parse(settings.packages);
      }
    } catch (e) {
      console.error('Error parsing settings.packages', e);
    }
    return [
      {
        id: 'wedding',
        name: 'งานแต่งงาน (Wedding)',
        price: '35,000',
        badge: 'ยอดฮิต',
        features: [
          'ช่างภาพหลัก 2 ท่าน + ผู้ช่วย 1 ท่าน',
          'ไฟแฟลชและระบบแสงสว่างแบบครบเซ็ต',
          'ถ่ายไม่จำกัดจำนวนภาพ (ส่งไฟล์ทั้งหมด)',
          'ปรับโทนสีและแสงทุกรูป',
          'ส่งงานแบบ Luxury Digital Gallery ภายใน 30 วัน'
        ]
      },
      {
        id: 'portrait',
        name: 'พอร์ตเทรต (Portrait)',
        price: '3,500',
        badge: '',
        features: [
          'ช่างภาพ 1 ท่าน ระยะเวลา 2 ชั่วโมง',
          'ให้คำแนะนำเรื่องท่าทางและมุมกล้อง',
          'รีทัชรูปพิเศษ 30 รูป',
          'ปรับแต่งแสงสีไฟล์ภาพให้ครบถ้วน',
          'ส่งงานแบบดิจิทัลลิงก์ภายใน 15 วัน'
        ]
      },
      {
        id: 'event',
        name: 'Event / Party',
        price: '15,000',
        badge: '',
        features: [
          'ช่างภาพ 1 ท่าน ระยะเวลา 4 ชั่วโมง',
          'เก็บภาพบรรยากาศทั่วไป และ Candid',
          'ส่งงานด่วน 50 รูปสำหรับทำข่าวภายใน 2 วัน',
          'ปรับโทนสีและส่งไฟล์ทั้งหมด',
          'ดาวน์โหลดผ่านแกลเลอรีภายใน 10 วัน'
        ]
      },
      {
        id: 'graduation',
        name: 'รับปริญญา (Graduation)',
        price: '4,500',
        badge: '',
        features: [
          'ช่างภาพ 1 ท่าน ครึ่งวัน (4 ชั่วโมง)',
          'นอกรอบเดี่ยว/กลุ่มย่อย ในและนอกสถานที่',
          'แต่งรูปโทนสวยละมุนทุกภาพ',
          'รีทัชภาพพิเศษ 15 รูป',
          'ลิงก์ดาวน์โหลดงานความคมชัดสูงภายใน 20 วัน'
        ]
      }
    ];
  };

  const getJobTypesList = () => {
    try {
      if (settings.job_types) {
        return JSON.parse(settings.job_types);
      }
    } catch (e) {
      console.error('Error parsing settings.job_types', e);
    }
    return [
      { id: 'wedding', label: 'งานแต่งงาน', days: 30, deposit: 5000 },
      { id: 'portrait', label: 'พอร์ตเทรต', days: 15, deposit: 1000 },
      { id: 'event', label: 'Event', days: 10, deposit: 3000 },
      { id: 'product', label: 'ถ่ายสินค้า', days: 7, deposit: 1500 },
      { id: 'family', label: 'ครอบครัว', days: 14, deposit: 2000 },
      { id: 'graduation', label: 'รับปริญญา', days: 20, deposit: 1500 },
      { id: 'custom', label: 'อื่นๆ', days: 30, deposit: 1000 }
    ];
  };

  // Fetch settings, photos, and availability
  useEffect(() => {
    fetchPortfolioData();
    if (clientUser) {
      fetchClientJobs(clientUser);
    }
    
    // Parse query params for auto-tracking
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page');
    const codeParam = params.get('code');
    if (pageParam === 'track') {
      setActivePage('track');
      if (codeParam && codeParam.trim().length === 6) {
        setTrackingCode(codeParam.toUpperCase().trim());
        
        const autoFetchTrack = async () => {
          setTrackingLoading(true);
          setTrackingError('');
          setTrackedJob(null);
          try {
            const res = await fetch(`${API_BASE}/public/track/${codeParam.trim()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'ไม่พบข้อมูลคิวงาน');
            setTrackedJob(data);
          } catch (err) {
            setTrackingError(err.message);
          } finally {
            setTrackingLoading(false);
          }
        };
        autoFetchTrack();
      }
    }
  }, []);

  // Sync client jobs when switching tabs or clientUser changes
  useEffect(() => {
    if (activePage === 'track' && clientUser) {
      fetchClientJobs(clientUser);
    }
  }, [activePage, clientUser]);


  // Auto-scroll to QR/result section when trackedJob data arrives
  useEffect(() => {
    if (trackedJob && trackResultRef.current) {
      setTimeout(() => {
        trackResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [trackedJob]);

  // Autofill profile info when user logs in
  useEffect(() => {
    if (clientUser) {
      setBookingClientName(clientUser.name || '');
      setBookingContact(clientUser.email || '');
    }
  }, [clientUser]);
  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      const [portfolioRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE}/public/portfolio`),
        fetch(`${API_BASE}/public/bookings`)
      ]);
      
      if (portfolioRes.ok) {
        const data = await portfolioRes.json();
        setPhotos(data.photos || []);
        setSettings(data.settings || {});
      } else {
        throw new Error('Server returned non-ok status');
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookedDates(bookingsData);
      }
    } catch (err) {
      console.error('Failed to load portfolio details, using mockup states:', err);
      setPhotos(MOCK_PHOTOS);
    } finally {
      setLoading(false);
    }
  };

  // Google Login — OAuth2 Popup Flow
  // เปิด Google account picker popup ทันทีเมื่อกดปุ่ม
  const triggerGoogleLogin = () => {
    setGoogleError('');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      // Dev fallback: no Client ID configured
      const email = window.prompt('(Dev mode) Enter your Gmail address:');
      const name = email ? email.split('@')[0] : 'User';
      if (email) {
        const devUser = { email, name, picture: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`, sub: 'dev' };
        localStorage.setItem('client_google_user', JSON.stringify(devUser));
        localStorage.setItem('client_google_access_token', 'dev');
        setClientUser(devUser);
        fetchClientJobs(devUser);
      }
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      setGoogleError('Google SDK ยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่');
      return;
    }

    // Use OAuth2 token client — opens Google account picker popup directly
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          setGoogleError('ยกเลิกการเข้าสู่ระบบ');
          return;
        }
        setGoogleLoading(true);
        try {
          // Fetch real user profile using the access token
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          });
          if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลบัญชี Google');
          const userInfo = await res.json();
          const user = {
            sub: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
          };
          localStorage.setItem('client_google_user', JSON.stringify(user));
          localStorage.setItem('client_google_access_token', tokenResponse.access_token);
          setClientUser(user);
          fetchClientJobs(user);
        } catch (err) {
          console.error('[Google Login] Error:', err.message);
          setGoogleError(err.message);
        } finally {
          setGoogleLoading(false);
        }
      }
    });

    tokenClient.requestAccessToken();
  };

  const handleClientLogout = () => {
    if (window.google?.accounts?.oauth2) {
      // Revoke token on logout so next login prompts account selection
      const token = localStorage.getItem('client_google_access_token');
      if (token && token !== 'dev') window.google.accounts.oauth2.revoke(token);
    }
    localStorage.removeItem('client_google_user');
    localStorage.removeItem('client_google_access_token');
    setClientUser(null);
    setClientJobs([]);
  };

  const fetchClientJobs = async (userObj = clientUser) => {
    const token = localStorage.getItem('client_google_access_token');
    if (!token || !userObj) {
      setClientJobs([]);
      return;
    }

    setClientJobsLoading(true);
    setClientJobsError('');
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      if (token === 'dev') {
        headers['X-Dev-Email'] = userObj.email;
      }

      const res = await fetch(`${API_BASE}/public/client-jobs`, { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถโหลดข้อมูลคิวงานได้');
      }
      setClientJobs(data);
    } catch (err) {
      console.error('[Fetch Client Jobs] Error:', err.message);
      setClientJobsError(err.message);
    } finally {
      setClientJobsLoading(false);
    }
  };


  // Helper to list occupied slots for selected date
  const getOccupiedSlots = (date) => {
    return bookedDates.filter(b => b.event_date === date);
  };

  // Check for time slot overlap in front-end
  const checkTimeOverlap = () => {
    if (!bookingDate || !bookingStartTime || !bookingEndTime) return null;
    
    const toMins = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const selStart = toMins(bookingStartTime);
    const selEnd = toMins(bookingEndTime);

    if (selStart >= selEnd) {
      return 'เวลาเริ่มถ่ายภาพต้องอยู่ก่อนเวลาสิ้นสุดงาน';
    }

    const occupied = getOccupiedSlots(bookingDate);
    for (const b of occupied) {
      const bStartStr = b.start_time || b.event_time.split(' - ')[0];
      const bEndStr = b.end_time || b.event_time.split(' - ')[1];
      if (!bStartStr || !bEndStr) continue;

      const bStart = toMins(bStartStr);
      const bEnd = toMins(bEndStr);

      if (selStart < bEnd && bStart < selEnd) {
        return `ช่วงเวลาดังกล่าวตรงกับคิวงานที่ถูกจองแล้ว (${bStartStr} - ${bEndStr} น.)`;
      }
    }
    return null;
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!clientUser) {
      triggerGoogleLogin();
      return;
    }

    const overlapError = checkTimeOverlap();
    if (overlapError) {
      alert(overlapError);
      return;
    }

    setSubmittingBooking(true);
    try {
      const res = await fetch(`${API_BASE}/public/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: bookingClientName || clientUser.name,
          contact: bookingContact || clientUser.email,
          email: clientUser.email,
          event_date: bookingDate,
          job_type: bookingJobType,
          location: bookingLocation,
          start_time: bookingStartTime,
          end_time: bookingEndTime,
          details: bookingDetails
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit booking');
      }

      setBookingSuccess(true);
      setBookingDate('');
      setBookingLocation('');
      setBookingStartTime('');
      setBookingEndTime('');
      setBookingDetails('');
      fetchPortfolioData(); // refresh availability
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleTrackJob = async (e) => {
    e.preventDefault();
    if (!trackingCode || trackingCode.trim().length !== 6) {
      setTrackingError('กรุณากรอกรหัสติดตามสถานะคิวงาน 6 หลัก');
      return;
    }

    setTrackingLoading(true);
    setTrackingError('');
    setTrackedJob(null);

    try {
      const res = await fetch(`${API_BASE}/public/track/${trackingCode.trim()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่พบข้อมูลคิวงานของรหัสติดตามนี้');
      }

      setTrackedJob(data);
    } catch (err) {
      setTrackingError(err.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleVerifySlip = async (bookingId) => {
    if (!slipImage) {
      setVerificationError('กรุณาเลือกหรืออัปโหลดหลักฐานการโอนเงิน (สลิป)');
      return;
    }

    setVerifyingSlip(true);
    setVerificationError('');
    try {
      const res = await fetch(`${API_BASE}/public/bookings/${bookingId}/verify-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slip_image: slipImage })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ตรวจสอบสลิปไม่สำเร็จ');
      }

      setVerificationSuccess(true);
      setSlipImage('');
      // Refresh the tracking details
      if (trackingCode) {
        const trackRes = await fetch(`${API_BASE}/public/track/${trackingCode.trim()}`);
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          setTrackedJob(trackData);
        }
      }
      if (clientUser) {
        fetchClientJobs(clientUser);
      }
    } catch (err) {
      setVerificationError(err.message);
    } finally {
      setVerifyingSlip(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSlipImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const generatePromptPayQR = (target, amount) => {
    if (!target) return '';
    const clean = target.replace(/[^0-9]/g, '');
    let targetTagValue = '';
    if (clean.length === 13 && !target.startsWith('0')) {
      targetTagValue = '0213' + clean;
    } else {
      let phone = clean;
      if (phone.startsWith('0')) {
        phone = '0066' + phone.substring(1);
      }
      targetTagValue = '0113' + phone;
    }

    const tag29Value = '0016A000000677010111' + targetTagValue;
    const tag29 = '29' + String(tag29Value.length).padStart(2, '0') + tag29Value;
    
    const tag53 = '5303764'; // THB
    
    let tag54 = '';
    if (amount) {
      const amountStr = Number(amount).toFixed(2);
      tag54 = '54' + String(amountStr.length).padStart(2, '0') + amountStr;
    }
    
    const tag58 = '5802TH';
    const data = '000201010212' + tag29 + tag53 + tag54 + tag58 + '6304';
    
    // CRC-CCITT (0x1021)
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xFF;
      x ^= x >> 4;
      crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ (x << 0)) & 0xFFFF;
    }
    
    const crcStr = crc.toString(16).toUpperCase().padStart(4, '0');
    return data + crcStr;
  };

  const handleSelectDateFromCalendar = (dateStr, status) => {
    setBookingDate(dateStr);
    if (status === 'half') {
      setBookingDetails('รายละเอียดเพิ่มเติม (เช่น ธีมสี, สิ่งที่อยากเน้น)');
    } else {
      setBookingDetails('');
    }
    setActivePage('book');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get distinct categories
  const categories = ['all', ...new Set(photos.map(p => p.category))];

  const filteredPhotos = selectedCategory === 'all'
    ? photos
    : photos.filter(p => p.category === selectedCategory);

  // Lightbox keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (!activePhoto) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        const currentIndex = filteredPhotos.findIndex(p => p.id === activePhoto.id);
        if (currentIndex > 0) {
          setActivePhoto(filteredPhotos[currentIndex - 1]);
        } else {
          setActivePhoto(filteredPhotos[filteredPhotos.length - 1]);
        }
      } else if (e.key === 'ArrowRight') {
        const currentIndex = filteredPhotos.findIndex(p => p.id === activePhoto.id);
        if (currentIndex < filteredPhotos.length - 1) {
          setActivePhoto(filteredPhotos[currentIndex + 1]);
        } else {
          setActivePhoto(filteredPhotos[0]);
        }
      } else if (e.key === 'Escape') {
        setActivePhoto(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePhoto, filteredPhotos]);

  const getStatusPercentage = (status) => {
    switch (status) {
      case 'briefed': return 25;
      case 'shooting': return 50;
      case 'editing': return 75;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const getCategoryLabel = (cat) => {
    if (cat === 'all') return 'ทั้งหมด';
    if (cat === 'wedding') return 'งานแต่งงาน';
    if (cat === 'portrait') return 'พอร์ตเทรต';
    if (cat === 'event') return 'Event / งานกิจกรรม';
    if (cat === 'graduation') return 'รับปริญญา';
    if (cat === 'family') return 'ครอบครัว';
    if (cat === 'product') return 'ถ่ายสินค้า';
    return cat;
  };

  const isOverlapError = checkTimeOverlap();
  const todayOccupiedSlots = getOccupiedSlots(bookingDate);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[#d8b76c]/3 rounded-full blur-[120px] pointer-events-none"></div>



      {/* Image Details Fullscreen Modal */}
      {activePhoto && (
        <div 
          onClick={() => setActivePhoto(null)} 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-fade-in"
        >
          {/* Prev Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const currentIndex = filteredPhotos.findIndex(p => p.id === activePhoto.id);
              if (currentIndex > 0) {
                setActivePhoto(filteredPhotos[currentIndex - 1]);
              } else {
                setActivePhoto(filteredPhotos[filteredPhotos.length - 1]);
              }
            }}
            className="absolute left-4 sm:left-8 z-50 backdrop-blur-md bg-white/5 hover:bg-[#d8b76c]/20 text-white hover:text-[#d8b76c] border border-white/10 hover:border-[#d8b76c]/40 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 text-lg font-bold shadow-lg"
          >
            &#10216;
          </button>

          {/* Main content area */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-5xl max-h-[85vh] overflow-hidden flex flex-col items-center"
          >
            <img 
              src={activePhoto.image_url} 
              alt={activePhoto.title} 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl border border-[#d8b76c]/20 cursor-pointer select-none" 
              onClick={(e) => {
                // Click on image advances to next image
                e.stopPropagation();
                const currentIndex = filteredPhotos.findIndex(p => p.id === activePhoto.id);
                if (currentIndex < filteredPhotos.length - 1) {
                  setActivePhoto(filteredPhotos[currentIndex + 1]);
                } else {
                  setActivePhoto(filteredPhotos[0]);
                }
              }}
            />
            <div className="text-center mt-4 space-y-1">
              <h3 className="font-bold text-lg text-white font-display">{activePhoto.title}</h3>
              <span className="text-xs font-semibold text-[#d8b76c] uppercase tracking-widest">{getCategoryLabel(activePhoto.category)}</span>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => setActivePhoto(null)}
              className="absolute top-2 right-2 text-white hover:text-red-400 text-3xl font-bold bg-slate-900/60 hover:bg-red-500/10 w-10 h-10 rounded-full flex items-center justify-center shadow transition-colors"
            >
              &times;
            </button>
          </div>

          {/* Next Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const currentIndex = filteredPhotos.findIndex(p => p.id === activePhoto.id);
              if (currentIndex < filteredPhotos.length - 1) {
                setActivePhoto(filteredPhotos[currentIndex + 1]);
              } else {
                setActivePhoto(filteredPhotos[0]);
              }
            }}
            className="absolute right-4 sm:right-8 z-50 backdrop-blur-md bg-white/5 hover:bg-[#d8b76c]/20 text-white hover:text-[#d8b76c] border border-white/10 hover:border-[#d8b76c]/40 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 text-lg font-bold shadow-lg"
          >
            &#10217;
          </button>
        </div>
      )}

      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#d8b76c]/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePage('gallery')}>
            <svg className="w-6 h-6 text-[#d8b76c]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-4.5-2c-.83 0-1.5.67-1.5 1.5S6.67 15 7.5 15s1.5-.67 1.5-1.5S8.33 12 7.5 12zm9 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-7.3-4.5c-.62 0-1.12.5-1.12 1.12 0 .63.5 1.13 1.12 1.13.63 0 1.13-.5 1.13-1.13 0-.62-.5-1.12-1.13-1.12zm5.6 0c-.62 0-1.12.5-1.12 1.12 0 .63.5 1.13 1.12 1.13.63 0 1.12-.5 1.12-1.13 0-.62-.5-1.12-1.12-1.12z" />
            </svg>
            <h1 className="font-bold tracking-tight text-[#d8b76c] font-display text-lg">ตีนแมวfoto</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <button 
              onClick={() => setActivePage('gallery')} 
              className={`font-semibold transition ${activePage === 'gallery' ? 'text-[#d8b76c]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ผลงาน
            </button>
            <button 
              onClick={() => setActivePage('pricing')} 
              className={`font-semibold transition ${activePage === 'pricing' ? 'text-[#d8b76c]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              แพ็กเกจ & ราคา
            </button>
            <button 
              onClick={() => setActivePage('book')} 
              className={`font-semibold transition ${activePage === 'book' ? 'text-[#d8b76c]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              จองคิวถ่ายภาพ
            </button>
            <button 
              onClick={() => setActivePage('track')} 
              className={`font-semibold transition ${activePage === 'track' ? 'text-[#d8b76c]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ติดตามสถานะคิวงาน
            </button>

            {clientUser ? (
              <div className="flex items-center gap-3 border-l border-slate-900 pl-6">
                <img src={clientUser.picture} alt={clientUser.name} className="w-6 h-6 rounded-full border border-[#d8b76c]/20" />
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">{clientUser.name}</span>
                <button onClick={handleClientLogout} className="text-xs text-slate-500 hover:text-red-400 font-semibold uppercase">
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button 
                onClick={triggerGoogleLogin}
                className="bg-[#d8b76c] text-[#161006] text-xs px-3.5 py-1.5 rounded-lg transition font-bold hover:brightness-110"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </nav>

          {/* Mobile Profile in Header */}
          <div className="flex md:hidden items-center gap-2">
            {clientUser ? (
              <div className="flex items-center gap-2">
                <img src={clientUser.picture} alt={clientUser.name} className="w-6 h-6 rounded-full border border-[#d8b76c]/20" />
                <button onClick={handleClientLogout} className="text-[10px] text-slate-500 hover:text-red-400 font-bold uppercase">
                  ออก
                </button>
              </div>
            ) : (
              <button 
                onClick={triggerGoogleLogin}
                className="bg-[#d8b76c] text-[#161006] text-[10px] px-2.5 py-1.5 rounded-lg transition font-bold hover:brightness-110"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Layout */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-12 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <div className="w-8 h-8 border-3 border-[#d8b76c]/20 border-t-[#d8b76c] rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <>
            {/* A. GALLERY PORTFOLIO SHOWCASE PAGE (WITH EMBEDDED AVAILABILITY CALENDAR) */}
            {activePage === 'gallery' && (
              <div className="space-y-16 animate-fade-in">
                {/* Hero Greeting Section */}
                <div className="text-center max-w-2xl mx-auto space-y-4">
                  <h2 className="text-4xl sm:text-5xl font-bold tracking-tight font-display text-white leading-tight">
                    {settings.welcome_title || 'Welcome to ตีนแมวfoto'}
                  </h2>
                  <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                    {settings.welcome_subtitle || 'Professional photography captures your precious milestones.'}
                  </p>
                  <button
                    onClick={() => setActivePage('pricing')}
                    className="bg-gradient-to-r from-[#d8b76c] to-[#9e7937] text-[#161006] font-bold py-3 px-6 rounded-xl shadow-lg shadow-[#d8b76c]/10 transition-all transform active:scale-95 text-sm"
                  >
                    ดูรายละเอียดแพ็กเกจ & ราคา
                  </button>
                </div>

                {/* Embedded Calendar Section */}
                <div className="border-t border-[#d8b76c]/10 pt-10">
                  <div className="text-center max-w-xl mx-auto space-y-2 mb-6">
                    <h3 className="text-2xl font-bold font-display text-white">ตารางคิวงาน & จองคิว</h3>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      คลิกวันที่ต้องการจองคิวถ่ายภาพ (แถบสีเขียว/สีฟ้า) เพื่อดำเนินการกรอกรายละเอียดและลงคิวจอง
                    </p>
                  </div>
                  <BookingCalendar 
                    bookedDates={bookedDates} 
                    onSelectDate={handleSelectDateFromCalendar} 
                  />
                </div>

                {/* Filter Categories Bar */}
                <div className="flex flex-wrap justify-center gap-2 border-b border-slate-900 pb-6 pt-6">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                        selectedCategory === cat
                          ? 'bg-[#d8b76c]/10 border border-[#d8b76c]/30 text-[#d8b76c] font-bold'
                          : 'bg-slate-900/30 hover:bg-slate-900 text-slate-400 border border-slate-900/40'
                      }`}
                    >
                      {getCategoryLabel(cat)}
                    </button>
                  ))}
                </div>

                {/* Grid Photo Showcase */}
                {filteredPhotos.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">ยังไม่มีการอัปโหลดรูปภาพผลงานในหมวดหมู่นี้</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredPhotos.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setActivePhoto(p)}
                        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-900 aspect-[4/5] bg-slate-950 animate-fade-in shadow-lg"
                      >
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-5">
                          <span className="text-[#d8b76c] text-xs font-bold uppercase tracking-widest">{getCategoryLabel(p.category)}</span>
                          <h4 className="font-bold text-white text-base mt-1 truncate">{p.title}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* B. PACKAGES & PRICING PAGE */}
            {activePage === 'pricing' && (
              <div className="space-y-12 animate-fade-in">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                  <h2 className="text-4xl font-bold tracking-tight font-display text-white">แพ็กเกจ & ราคา (Pricing)</h2>
                  <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                    เลือกสรรแพ็กเกจถ่ายภาพที่ดีที่สุดสำหรับเวลาสำคัญของคุณ ถ่ายภาพโดยทีมงานมืออาชีพ
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {getPackagesList().map(pkg => (
                    <div 
                      key={pkg.id} 
                      className={`relative flex flex-col justify-between p-6 bg-slate-900/40 border rounded-2xl transition hover:border-[#d8b76c]/60 shadow-lg ${
                        pkg.badge ? 'border-[#d8b76c] ring-1 ring-[#d8b76c]' : 'border-slate-800'
                      }`}
                    >
                      {pkg.badge && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#d8b76c] text-[#161006] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {pkg.badge}
                        </span>
                      )}
                      
                      <div className="space-y-4">
                        <div className="text-center space-y-1">
                          <h4 className="font-bold text-white text-base font-display">{pkg.name}</h4>
                          <div className="text-3xl font-bold font-outfit text-[#d8b76c] mt-2">
                            เริ่มต้น ฿ {pkg.price}
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold block mt-1">ราคาเริ่มต้นต่อวัน/ครั้ง</span>
                        </div>

                        <ul className="space-y-2.5 pt-4 text-xs text-slate-300">
                           {(pkg.features || []).map((feat, i) => (
                            <li key={i} className="flex gap-2 items-start leading-relaxed">
                              <span className="text-[#d8b76c] shrink-0 font-bold">✓</span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => {
                          setBookingJobType(pkg.id);
                          setBookingDetails(`จองแพ็กเกจ: ${pkg.name}`);
                          setActivePage('book');
                        }}
                        className={`w-full py-2.5 rounded-xl font-bold transition text-xs mt-6 ${
                          pkg.badge 
                            ? 'bg-[#d8b76c] text-[#161006] hover:brightness-110 shadow-lg shadow-[#d8b76c]/10' 
                            : 'bg-slate-950 border border-[#d8b76c]/20 hover:bg-[#d8b76c]/5 text-[#d8b76c]'
                        }`}
                      >
                        จองคิวแพ็กเกจนี้
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C. BOOKING SESSION FORM PAGE */}
            {activePage === 'book' && (
              <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
                <div className="text-center space-y-2 mb-4">
                  <h2 className="text-3xl font-bold font-display text-white">จองคิวถ่ายภาพ</h2>
                  <p className="text-slate-400 text-sm">กรอกข้อมูลรายละเอียดการจองคิวถ่ายภาพ (กรุณาเข้าสู่ระบบ Google เพื่อส่งข้อมูลคำขอ)</p>
                </div>

                {bookingSuccess ? (
                  <div className="glass p-8 rounded-2xl border border-green-500/20 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-green-400 font-bold text-xl font-display">ส่งคำขอจองคิวสำเร็จ!</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      ขอขอบคุณที่ลงคิวจองถ่ายภาพกับเรา! ระบบได้รับคำขอจองคิวเรียบร้อยแล้ว ช่างภาพจะตรวจสอบวันเวลาและอนุมัติโดยเร็วที่สุด เมื่อได้รับการอนุมัติแล้ว คุณจะได้รับรหัสติดตามสถานะ 6 หลัก เพื่อนำมาตรวจสอบ ชำระเงินมัดจำ และยืนยันคิวงานได้ในแท็บ "ติดตามสถานะ"
                    </p>
                    <button
                      onClick={() => setBookingSuccess(false)}
                      className="px-6 py-2 bg-[#d8b76c] text-[#161006] text-sm font-bold rounded-xl transition hover:brightness-110"
                    >
                      จองคิวถ่ายภาพเพิ่มเติมอีกครั้ง
                    </button>
                  </div>
                ) : (
                  <div className="glass p-6 rounded-2xl border border-[#d8b76c]/20">
                    {!clientUser ? (
                      <div className="text-center py-8 space-y-4">
                        <svg className="w-12 h-12 mx-auto mb-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <h4 className="font-bold text-white font-display">กรุณาเข้าสู่ระบบด้วย Google</h4>
                        <p className="text-xs text-slate-400 leading-relaxed px-4">
                          เพื่อความปลอดภัยและใช้ยืนยันตัวตนในการลงคิวงาน กรุณาเข้าสู่ระบบด้วย Google Account ของคุณ
                        </p>

                        {googleError && (
                          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">
                            {googleError}
                          </div>
                        )}

                        {/* Primary sign-in button */}
                        <button
                          onClick={triggerGoogleLogin}
                          disabled={googleLoading}
                          className="bg-white hover:bg-slate-100 text-slate-900 font-bold py-2.5 px-6 rounded-xl transition text-sm flex items-center gap-2.5 mx-auto shadow disabled:opacity-60"
                        >
                          {googleLoading ? (
                            <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          )}
                          {googleLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
                        </button>

                        {/* GSI renders official button here as fallback */}
                        <div id="google-signin-btn" className="flex justify-center" />
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitBooking} className="space-y-5 text-xs">
                        {/* Auto-filled Google Profile */}
                        <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl flex items-center gap-3">
                          <img src={clientUser.picture} className="w-8 h-8 rounded-full border border-[#d8b76c]/20" />
                          <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">บัญชีผู้ใช้จองคิว</div>
                            <div className="text-sm font-bold text-slate-200">{clientUser.name} ({clientUser.email})</div>
                          </div>
                        </div>

                        {/* Schedule Info Section */}
                        <div className="bg-[#141414]/30 border border-slate-800 p-4 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-[#d8b76c] font-display border-b border-slate-800 pb-2">ข้อมูลติดต่อและวันเวลาถ่ายภาพ</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold">ชื่อลูกค้า / ผู้ติดต่อ *</label>
                              <input
                                type="text"
                                required
                                value={bookingClientName}
                                onChange={e => setBookingClientName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-[#d8b76c] text-xs transition"
                              />
                            </div>

                            <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold">อีเมลติดต่อกลับ *</label>
                              <input
                                type="email"
                                required
                                value={bookingContact}
                                onChange={e => setBookingContact(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-[#d8b76c] text-xs transition"
                              />
                            </div>

                            <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold">วันที่จองถ่ายภาพ *</label>
                              <input
                                type="date"
                                required
                                value={bookingDate}
                                onChange={e => setBookingDate(e.target.value)}
                                onClick={e => { try { e.target.showPicker(); } catch (err) {} }}
                                onFocus={e => { try { e.target.showPicker(); } catch (err) {} }}
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-[#d8b76c] text-xs transition cursor-pointer"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1.5 font-semibold">ประเภทงานถ่ายภาพ *</label>
                              <select
                                value={bookingJobType}
                                onChange={e => setBookingJobType(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-[#d8b76c] font-semibold text-slate-300 text-xs"
                              >
                                {getJobTypesList().map(t => (
                                  <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1.5 font-semibold">เวลาเริ่มงาน *</label>
                              <input
                                type="time"
                                required
                                value={bookingStartTime}
                                onChange={e => setBookingStartTime(e.target.value)}
                                onClick={e => { try { e.target.showPicker(); } catch (err) {} }}
                                onFocus={e => { try { e.target.showPicker(); } catch (err) {} }}
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-[#d8b76c] text-xs cursor-pointer"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1.5 font-semibold">เวลาสิ้นสุดงาน *</label>
                              <input
                                type="time"
                                required
                                value={bookingEndTime}
                                onChange={e => setBookingEndTime(e.target.value)}
                                onClick={e => { try { e.target.showPicker(); } catch (err) {} }}
                                onFocus={e => { try { e.target.showPicker(); } catch (err) {} }}
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-[#d8b76c] text-xs cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Existing occupied slots on the same date */}
                          {bookingDate && todayOccupiedSlots.length > 0 && (
                            <div className="p-3 bg-[#16130e] border border-[#d8b76c]/20 rounded-xl space-y-1.5">
                              <span className="text-[10px] font-bold text-[#d8b76c] uppercase block">คิวงานที่มีการจองแล้วในวันนี้:</span>
                              <div className="flex flex-wrap gap-2">
                                {todayOccupiedSlots.map((b, idx) => {
                                  const tStart = b.start_time || b.event_time.split(' - ')[0];
                                  const tEnd = b.end_time || b.event_time.split(' - ')[1];
                                  return (
                                    <span key={idx} className="bg-slate-950 border border-slate-900 text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-semibold">
                                      • {tStart} - {tEnd} น. ({b.status === 'approved' ? 'จองแล้ว' : 'รอการอนุมัติ'})
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Overlap Error Warning Alert */}
                          {isOverlapError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center font-bold text-xs">
                              {isOverlapError}
                            </div>
                          )}
                        </div>

                        {/* Location and specifications */}
                        <div className="bg-[#141414]/30 border border-slate-800 p-4 rounded-xl space-y-4">
                          <h3 className="text-sm font-bold text-[#d8b76c] font-display border-b border-slate-800 pb-2">สถานที่และรายละเอียดบริการเพิ่มเติม</h3>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-slate-400 mb-1.5 font-semibold">สถานที่ถ่ายภาพ</label>
                              <input
                                type="text"
                                value={bookingLocation}
                                onChange={e => setBookingLocation(e.target.value)}
                                placeholder="เช่น สวนสาธารณะ, สตูดิโอ, โรงแรม หรือธีมงานและโทนสีที่คุณชอบ"
                                className="w-full bg-slate-950 border border-slate-900 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none transition"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1.5 font-semibold">รายละเอียดเพิ่มเติม</label>
                              <textarea
                                value={bookingDetails}
                                onChange={e => setBookingDetails(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-900 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none transition h-20 resize-none"
                                placeholder="รายละเอียดเพิ่มเติม (เช่น ธีมสี, สิ่งที่อยากเน้น)"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submittingBooking}
                          className="w-full bg-gradient-to-r from-[#d8b76c] to-[#9e7937] text-[#161006] font-bold py-3 rounded-xl transition text-sm disabled:opacity-50 hover:brightness-110 shadow-lg shadow-[#d8b76c]/10"
                        >
                          {submittingBooking ? 'กำลังส่งข้อมูล...' : 'ส่งคำขอจองคิวงาน'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* D. TRACKING PAGE */}
            {activePage === 'track' && (
              <div className="max-w-md mx-auto space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold font-display text-white">ติดตามสถานะคิวงาน</h2>
                  <p className="text-slate-400 text-sm">กรอกรหัสติดตาม 6 หลักเพื่อตรวจสอบความคืบหน้าของคิวงานและรายละเอียดการจัดส่ง</p>
                </div>

                {/* Client Logged In Jobs List Section */}
                {clientUser && (
                  <div className="glass p-5 rounded-2xl border border-[#d8b76c]/10 space-y-4">
                    <h3 className="text-sm font-bold text-[#d8b76c] font-display flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#d8b76c] inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span>คิวงานของคุณ</span>
                      <span className="text-[10px] bg-[#d8b76c]/10 text-[#d8b76c] px-2 py-0.5 rounded-full font-semibold">
                        {clientJobs.length} รายการ
                      </span>
                    </h3>

                    {clientJobsLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="w-5 h-5 border-2 border-[#d8b76c]/20 border-t-[#d8b76c] rounded-full animate-spin"></div>
                      </div>
                    ) : clientJobsError ? (
                      <p className="text-xs text-red-400 text-center">{clientJobsError}</p>
                    ) : clientJobs.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-2">ยังไม่มีประวัติการจองคิวด้วยอีเมลนี้</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {clientJobs.map((job) => {
                          let statusLabel = 'รอดำเนินการ';
                          let statusColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20';

                          if (job.booking_status === 'pending') {
                            statusLabel = 'รอตรวจสอบคิวงาน';
                            statusColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
                          } else if (job.booking_status === 'pending_deposit') {
                            statusLabel = 'รอชำระเงินมัดจำ';
                            statusColor = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
                          } else if (job.booking_status === 'rejected') {
                            statusLabel = 'ปฏิเสธคำขอ';
                            statusColor = 'text-red-400 bg-red-400/10 border-red-400/20';
                          } else if (job.booking_status === 'approved') {
                            if (job.job_status === 'briefed') {
                              statusLabel = 'รับบรีฟแล้ว';
                              statusColor = 'text-blue-400 bg-blue-400/10 border-blue-400/20';
                            } else if (job.job_status === 'shooting') {
                              statusLabel = 'กำลังถ่ายภาพ';
                              statusColor = 'text-purple-400 bg-purple-400/10 border-purple-400/20';
                            } else if (job.job_status === 'editing') {
                              statusLabel = 'กำลังแต่งภาพ';
                              statusColor = 'text-pink-400 bg-pink-400/10 border-pink-400/20';
                            } else if (job.job_status === 'completed') {
                              statusLabel = 'ส่งงานแล้ว';
                              statusColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
                            }
                          }

                          const isSelected = trackedJob && trackedJob.booking_id === job.booking_id;

                          return (
                            <button
                              key={job.booking_id}
                              onClick={async () => {
                                if (job.tracking_code) {
                                  setTrackingCode(job.tracking_code);
                                  setTrackingLoading(true);
                                  setTrackingError('');
                                  setTrackedJob(null);
                                  try {
                                    const res = await fetch(`${API_BASE}/public/track/${job.tracking_code}`);
                                    const data = await res.json();
                                    if (res.ok) {
                                      setTrackedJob(data);
                                    } else {
                                      throw new Error(data.error);
                                    }
                                  } catch (err) {
                                    setTrackingError(err.message);
                                  } finally {
                                    setTrackingLoading(false);
                                  }
                                } else {
                                  setTrackingCode('');
                                  setTrackedJob({
                                    id: null,
                                    booking_id: job.booking_id,
                                    client_name: job.client_name,
                                    event_date: job.event_date,
                                    event_time: job.event_time,
                                    job_type: job.job_type,
                                    location: job.location,
                                    booking_status: job.booking_status,
                                    deposit: job.deposit,
                                    price: job.price,
                                    status: null,
                                    download_url: null,
                                    note: job.note
                                  });
                                }
                              }}
                              className={`w-full text-left p-3 rounded-xl border transition flex justify-between items-center ${
                                isSelected
                                  ? 'bg-[#d8b76c]/10 border-[#d8b76c]/40'
                                  : 'bg-slate-950/60 border-slate-900 hover:border-[#d8b76c]/30 hover:bg-[#d8b76c]/5'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-white font-display">
                                  {getJobTypesList().find(t => t.id === job.job_type)?.label || 'อื่นๆ'}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {job.event_date} {job.event_time ? `(${job.event_time})` : ''}
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleTrackJob} className="flex gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={trackingCode}
                    onChange={e => setTrackingCode(e.target.value)}
                    placeholder="กรอกรหัสติดตาม 6 หลัก"
                    className="flex-grow bg-slate-950 border border-slate-900/60 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest text-slate-100 placeholder:text-slate-700 placeholder:text-xs outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={trackingLoading}
                    className="bg-[#d8b76c] text-[#161006] font-bold px-6 rounded-xl transition text-sm shrink-0 hover:brightness-110"
                  >
                    {trackingLoading ? 'กำลังค้นหา...' : 'ตรวจสอบสถานะ'}
                  </button>
                </form>

                {trackingError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl text-center font-semibold">
                    {trackingError}
                  </div>
                )}

                {/* Tracked Job Display Details */}
                {trackedJob && (
                  <div ref={trackResultRef} className="glass p-6 rounded-2xl space-y-6 border border-[#d8b76c]/20">
                    <div className="flex justify-between items-start border-b border-slate-900 pb-4">
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">ชื่อลูกค้า</span>
                        <h4 className="font-bold text-white text-lg font-display">{trackedJob.client_name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">วันที่ถ่ายภาพ</span>
                        <div className="font-semibold text-slate-300">{trackedJob.event_date}</div>
                      </div>
                    </div>

                    {trackedJob.booking_status === 'pending' ? (
                      /* Pending review display */
                      <div className="space-y-4 animate-fade-in text-center py-4">
                        <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400">
                          <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-200">อยู่ระหว่างรอตรวจสอบคิวงาน</h4>
                          <p className="text-xs text-slate-400">
                            ช่างภาพได้รับคำขอจองคิวของคุณเรียบร้อยแล้วและกำลังตรวจสอบตารางเวลา 
                            ระบบจะส่งอีเมลแจ้งความคืบหน้าให้คุณโดยเร็วที่สุด
                          </p>
                        </div>
                      </div>
                    ) : trackedJob.booking_status === 'rejected' ? (
                      /* Rejected display */
                      <div className="space-y-4 animate-fade-in text-center py-4">
                        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400 text-xl font-bold">
                          ✕
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-200 font-display">ปฏิเสธคำขอจองคิวงาน</h4>
                          <p className="text-xs text-slate-400">
                            ขออภัยด้วยครับ ช่างภาพไม่สามารถรับคิวงานนี้ได้ในขณะนี้
                          </p>
                          {trackedJob.note && (
                            <div className="mt-3 p-3 bg-red-500/5 border border-red-500/10 text-slate-400 text-xs rounded-xl italic">
                              เหตุผล: {trackedJob.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : trackedJob.booking_status === 'pending_deposit' ? (
                      /* Deposit Payment workflow */
                      <div className="space-y-6 animate-fade-in">
                        <div className="text-center bg-[#16130e] border border-[#d8b76c]/20 p-4 rounded-xl space-y-2">
                          <span className="text-[10px] font-bold text-[#d8b76c] uppercase tracking-widest block font-mono">WAITING FOR DEPOSIT</span>
                          <h4 className="text-sm font-bold text-slate-200">
                            คำขอจองคิวถ่ายภาพของคุณได้รับการอนุมัติแล้ว!
                          </h4>
                          <p className="text-xs text-slate-400">
                            กรุณาชำระเงินมัดจำเป็นจำนวน <strong className="text-amber-400 font-mono text-sm">฿{Number(trackedJob.deposit || 1000).toLocaleString()}</strong> บาท เพื่อยืนยันคิวงาน
                          </p>
                        </div>

                        {/* PromptPay QR Section */}
                        <div className="flex flex-col items-center justify-center p-5 bg-slate-950 rounded-xl border border-slate-900 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 font-extrabold text-base tracking-wider font-mono">Prompt Pay</span>
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold uppercase font-mono">QR DEPOSIT</span>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-800 shadow-xl">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatePromptPayQR(settings.promptpay_id || '0938106998', trackedJob.deposit || 1000))}`}
                              alt="PromptPay QR Code"
                              className="w-44 h-44 block"
                            />
                          </div>

                          <div className="text-center text-[10px] text-slate-500 space-y-1 font-semibold">
                            <div>เลขบัญชีพร้อมเพย์: <span className="font-mono text-slate-400">{settings.promptpay_id || '0938106998'}</span></div>
                            <div>ชื่อบัญชี: <span className="text-slate-400">{settings.studio_name || 'ตีนแมวfoto'}</span></div>
                            <div className="text-amber-500/90 font-bold mt-1">(หลังจากโอนเงินเรียบร้อยแล้ว กรุณาอัปโหลดสลิปที่ปุ่มด้านล่างเพื่อยืนยันคิวงาน)</div>
                          </div>
                        </div>

                        {/* Upload slip section */}
                        <div className="space-y-4 pt-4 border-t border-slate-900">
                          <div>
                            <label className="block text-slate-400 font-bold text-xs mb-2">อัปโหลดหลักฐานการโอนเงิน (สลิป) *</label>
                            <input
                              type="file"
                              accept="image/*"
                              required
                              onChange={handleFileChange}
                              className="w-full text-xs text-slate-400 bg-slate-950 border border-slate-900 rounded-xl px-4 py-3 cursor-pointer file:mr-4 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#d8b76c]/10 file:text-[#d8b76c] hover:file:bg-[#d8b76c]/20"
                            />
                          </div>

                          {slipImage && (
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 text-center space-y-2">
                              <span className="text-[10px] text-slate-500 font-semibold block">รูปภาพหลักฐานการโอนเงินที่ต้องการอัปโหลด</span>
                              <img src={slipImage} alt="Uploaded Slip Preview" className="max-w-[150px] max-h-[220px] rounded border border-slate-800 mx-auto block shadow-lg" />
                            </div>
                          )}

                          {verificationError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl text-center font-semibold">
                              {verificationError}
                            </div>
                          )}

                          {verificationSuccess && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3.5 rounded-xl text-center font-bold">
                              ✓ ยืนยันการโอนเงินสำเร็จ คิวงานเข้าสู่ระบบแล้ว!
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={verifyingSlip || !slipImage}
                            onClick={() => handleVerifySlip(trackedJob.booking_id)}
                            className="w-full bg-[#d8b76c] text-[#161006] font-bold py-3 rounded-xl transition text-sm disabled:opacity-50 hover:brightness-110 shadow-lg shadow-[#d8b76c]/10"
                          >
                            {verifyingSlip ? 'กำลังตรวจสอบสลิปด้วยระบบ Thunder Solution...' : 'ยืนยันการชำระเงินและล็อกคิวงาน'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Progress Bar and Normal display */
                      <>
                        {/* Progress Bar UI */}
                        <div className="space-y-4">
                          <div className="flex justify-between text-xs text-slate-400 uppercase tracking-wider font-medium">
                            <span>ความคืบหน้าคิวงาน</span>
                            <span className="text-[#d8b76c] font-bold">
                              {trackedJob.status === 'briefed' && 'ได้รับข้อมูลบรีฟเรียบร้อยแล้ว'}
                              {trackedJob.status === 'shooting' && 'ช่างภาพกำลังดำเนินการถ่ายภาพ'}
                              {trackedJob.status === 'editing' && 'กำลังดำเนินการปรับแต่งและทำสีรูปภาพ'}
                              {trackedJob.status === 'completed' && 'ส่งงานเสร็จสิ้นเรียบร้อยแล้ว'}
                            </span>
                          </div>
                          
                          {/* Bar indicator */}
                          <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-900">
                            <div 
                              className="bg-gradient-to-r from-[#d8b76c] to-[#9e7937] h-full rounded-full transition-all duration-500"
                              style={{ width: `${getStatusPercentage(trackedJob.status)}%` }}
                            ></div>
                          </div>

                          {/* Stepper text guides */}
                          <div className="grid grid-cols-4 text-[10px] text-center text-slate-500 font-semibold tracking-wide leading-normal">
                            <div className={trackedJob.status === 'briefed' ? 'text-[#d8b76c] font-bold' : ''}>รับบรีฟงาน</div>
                            <div className={trackedJob.status === 'shooting' ? 'text-[#d8b76c] font-bold' : ''}>ถ่ายภาพ</div>
                            <div className={trackedJob.status === 'editing' ? 'text-[#d8b76c] font-bold' : ''}>ปรับแต่งรูปภาพ</div>
                            <div className={trackedJob.status === 'completed' ? 'text-[#d8b76c] font-bold' : ''}>ส่งมอบงาน</div>
                          </div>
                        </div>

                        {/* Download delivery button */}
                        {trackedJob.status === 'completed' && (
                          <div className="pt-4 border-t border-slate-900 text-center space-y-3">
                            <p className="text-xs text-[#74d98a] font-semibold flex items-center justify-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>คิวงานถ่ายภาพของคุณเสร็จสมบูรณ์เรียบร้อยแล้วครับ!</span>
                            </p>
                            {trackedJob.download_url ? (
                              <a
                                href={trackedJob.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block w-full bg-[#d8b76c] text-[#161006] font-bold py-3 px-6 rounded-xl transition text-sm shadow-lg hover:brightness-110"
                              >
                  ดาวน์โหลดรูปภาพทั้งหมด (ความละเอียดสูง)
                              </a>
                            ) : (
                    <p className="text-xs text-slate-500 italic">ช่างภาพกำลังเตรียมลิงก์ดาวน์โหลดผลงาน กรุณาตรวจสอบอีกครั้งในภายหลัง</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer & Secret Link */}
      <footer className="border-t border-slate-900/60 bg-slate-950/20 py-8 text-center text-xs text-slate-600">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 ตีนแมวfoto. สงวนลิขสิทธิ์ทั้งหมด</p>
          
          <div className="flex items-center gap-4">
            <span className="text-slate-700">|</span>
            <a
              href={import.meta.env.VITE_MANAGER_URL || 'http://localhost:3001'}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#d8b76c] transition"
            title="ระบบจัดการของช่างภาพ"
            >
            เข้าระบบจัดการของช่างภาพ (Manager)
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-[#d8b76c]/10 py-2.5 px-4 flex justify-around items-center shadow-lg shadow-black/85">
        <button 
          onClick={() => setActivePage('gallery')} 
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition ${activePage === 'gallery' ? 'text-[#d8b76c]' : 'text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>ผลงาน</span>
        </button>

        <button 
          onClick={() => setActivePage('pricing')} 
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition ${activePage === 'pricing' ? 'text-[#d8b76c]' : 'text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>แพ็กเกจ</span>
        </button>

        <button 
          onClick={() => setActivePage('book')} 
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition ${activePage === 'book' ? 'text-[#d8b76c]' : 'text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>จองคิว</span>
        </button>

        <button 
          onClick={() => setActivePage('track')} 
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition ${activePage === 'track' ? 'text-[#d8b76c]' : 'text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span>ติดตามงาน</span>
        </button>
      </nav>
    </div>
  );
}

function BookingCalendar({ bookedDates, onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthsTH = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Days in selected month
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay(); // 0 is Sunday, 6 is Saturday

  const totalDays = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysArray = [];
  // Padding for previous month's days
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  // Days of current month
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(d);
  }

  const getDayAvailability = (dateStr) => {
    const dayBookings = bookedDates.filter(b => b.event_date === dateStr);
    if (dayBookings.length === 0) {
      return { status: 'available', color: '#74d98a', label: 'ว่าง' };
    }
    if (dayBookings.length === 1) {
      return { status: 'half', color: '#8eb8ff', label: 'ครึ่งวัน' };
    }
      return { status: 'full', color: '#ff6b6b', label: 'คิวเต็ม' };
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-zinc-800 border border-[#d8b76c]/20 p-6 rounded-2xl shadow-xl space-y-6">
      {/* Calendar Header */}
      <div className="flex justify-between items-center border-b border-[#d8b76c]/10 pb-4">
        <button 
          onClick={prevMonth}
          className="p-2 border border-[#d8b76c]/20 hover:bg-[#d8b76c]/10 rounded-xl transition text-[#d8b76c] font-bold text-sm"
        >
      &larr; เดือนก่อนหน้า
        </button>
        <h3 className="text-xl font-bold font-display text-white">
          {monthsTH[month]} {year + 543}
        </h3>
        <button 
          onClick={nextMonth}
          className="p-2 border border-[#d8b76c]/20 hover:bg-[#d8b76c]/10 rounded-xl transition text-[#d8b76c] font-bold text-sm"
        >
      เดือนถัดไป &rarr;
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center text-xs font-bold text-[#d8b76c] uppercase tracking-wider mb-2">
        <div>อา.</div><div>จ.</div><div>อ.</div><div>พ.</div><div>พฤ.</div><div>ศ.</div><div>ส.</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2.5">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square"></div>;
          }

          // Format date string YYYY-MM-DD
          const mm = String(month + 1).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          const dateStr = `${year}-${mm}-${dd}`;
          
          const availability = getDayAvailability(dateStr);
          const isFull = availability.status === 'full';

          return (
            <button
              key={`day-${day}`}
              disabled={isFull}
              onClick={() => onSelectDate(dateStr, availability.status)}
              className={`aspect-square rounded-xl p-1.5 flex flex-col justify-between items-center transition border ${
                isFull 
                  ? 'bg-slate-900/10 border-transparent text-slate-600 cursor-not-allowed'
                  : 'bg-slate-950 hover:bg-[#d8b76c]/5 border-slate-900 hover:border-[#d8b76c]/40 text-slate-100'
              }`}
            >
              <span className="text-xs font-bold font-mono self-start">{day}</span>
              
              {/* Status Indicator Dot */}
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ 
                  backgroundColor: isFull ? '#475569' : availability.color,
                  boxShadow: isFull ? 'none' : `0 0 8px ${availability.color}`
                }}
              title={isFull ? 'คิวเต็ม' : availability.label}
              ></div>
            </button>
          );
        })}
      </div>

      {/* Legend Guide */}
      <div className="flex justify-center gap-6 border-t border-[#d8b76c]/10 pt-4 text-xs font-medium text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#74d98a] shadow-[0_0_6px_#74d98a]"></div>
              <span>คิวว่าง (ลงคิวได้)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#8eb8ff] shadow-[0_0_6px_#8eb8ff]"></div>
              <span>ว่างครึ่งวันเช้า/บ่าย (ลงคิวได้)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#475569]"></div>
              <span>คิวเต็ม (ปิดรับจอง)</span>
        </div>
      </div>
    </div>
  );
}
