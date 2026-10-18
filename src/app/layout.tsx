import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "سَكِينَة | مواقيت الصلاة والقرآن والأذكار والتاسكات والتايمر",
  description:
    "موقع متكامل يجمع كل حاجة: مواقيت الصلاة بتوقيتك المحلي، تنبيه الأذان الصوتي، أذكار وآيات تتجدد كل دقيقة مع تلاوة صوتية، القرآن الكريم بأكثر من ١٧ قارئ وكل السور، أنميشن خلفية جميل، التاسكات وكورسات التحدي، تايمر المذاكرة، نظام XP وإنجازات موحد، القبلة، والإحصائيات — كل ذلك بثيمات جميلة وقابلة للتخصيص.",
  keywords: [
    "مواقيت الصلاة",
    "الأذان",
    "أذكار",
    "القرآن",
    "القبلة",
    "صلاة",
    "إسلام",
    "تاسكات",
    "مهام",
    "تايمر مذاكرة",
    "تحدي",
    "prayer times",
    "adhan",
    "tasks",
    "study timer",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#071a14",
};

// يطبّق الثيم المحفوظ قبل أول رسم لمنع وميض الشاشة
const themeInitScript = `
(function(){
  try {
    var s = JSON.parse(localStorage.getItem('sakinah.settings') || '{}');
    var root = document.documentElement;
    root.dataset.theme = s.theme || 'emerald-night';
    root.dataset.animations = (s.animations === false) ? 'off' : 'on';
    if (s.customAccent) {
      root.style.setProperty('--accent', s.customAccent);
      root.style.setProperty('--glow', s.customAccent + '59');
    }
    if (s.customAccent2) {
      root.style.setProperty('--accent2', s.customAccent2);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-theme="emerald-night" data-animations="on">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
