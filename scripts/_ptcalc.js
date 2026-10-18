const pad=n=>String(n).padStart(2,"0");

const PMAP={'5':{f:19.5,i:17.5},'4':{f:18.5,iMin:90},'3':{f:18,i:17},'2':{f:15,i:15},'9':{f:18,i:17.5},'10':{f:18,iMin:90},'1':{f:18,i:18}};
const dsin=function(a){return Math.sin(a*Math.PI/180)},dcos=function(a){return Math.cos(a*Math.PI/180)},dtan=function(a){return Math.tan(a*Math.PI/180)};
const fixv=function(a,n){a=a-n*Math.floor(a/n);return a<0?a+n:a};
function localTimings(dt,lat,lng,method){
  const M=PMAP[method]||PMAP['5'],tz=-dt.getTimezoneOffset()/60;
  const y=dt.getFullYear(),m0=dt.getMonth()+1,d0=dt.getDate();
  const yy=m0<=2?y-1:y,mm=m0<=2?m0+12:m0;
  const A=Math.floor(yy/100),B=2-A+Math.floor(A/4);
  const jdBase=Math.floor(365.25*(yy+4716))+Math.floor(30.6001*(mm+1))+d0+B-1524.5;
  const jDate=jdBase-lng/(15*24);
  function sunPos(t){const D=jDate+t-2451545;
    const g=fixv(357.529+0.98560028*D,360),q=fixv(280.459+0.98564736*D,360);
    const L=fixv(q+1.915*dsin(g)+0.020*dsin(2*g),360),e=23.439-0.00000036*D;
    const RA=fixv(Math.atan2(dcos(e)*dsin(L),dcos(L))/Math.PI*12,24);
    return{d:Math.asin(dsin(e)*dsin(L))*180/Math.PI,eq:q/15-RA}}
  function midDay(t){return fixv(12-sunPos(t).eq,24)}
  function angTime(angle,t,ccw){const p=sunPos(t),D=p.d;
    let v=(-dsin(angle)-dsin(D)*dsin(lat))/(dcos(D)*dcos(lat));
    if(v<-1||v>1)return NaN;
    const tt=Math.acos(v)/Math.PI*12;
    return midDay(t)+(ccw?-tt:tt)}
  function asrT(factor,t){const p=sunPos(t),D=p.d;
    const angle=-Math.atan(1/(factor+dtan(Math.abs(lat-D))))*180/Math.PI;
    return angTime(angle,t,false)}
  function fmtT(t){if(isNaN(t))return null;t=fixv(t,24);let mins=Math.round(t*60);const h=Math.floor(mins/60)%24;mins%=60;return pad(h)+':'+pad(mins)}
  const faj=angTime(M.f,5/24,true),shr=angTime(0.833,6/24,true),dh=midDay(12/24),asr=asrT(1,15/24),mag=angTime(0.833,18/24,false);
  const ish=M.iMin?mag+M.iMin/60:angTime(M.i,19/24,false);
  const adj=tz-lng/15,out={Fajr:fmtT(faj+adj),Sunrise:fmtT(shr+adj),Dhuhr:fmtT(dh+adj),Asr:fmtT(asr+adj),Maghrib:fmtT(mag+adj),Isha:fmtT(ish+adj)};
  return Object.keys(out).every(function(k){return out[k]})?out:null;
}

module.exports={localTimings,PMAP};