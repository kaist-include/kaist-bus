import{r as b,t as F,h as _,i as K,f as B,a as W,b as Y,g as N,c as v}from"./stopLabels-Dfnzt6Cm.js";const J=[{id:"notice-2026-02-01",title:"2월 1일 설 연휴 운행 안내",body:"해당일은 휴일 시간표로 운행됩니다. 출발 전 꼭 시간표를 확인해 주세요.",startDate:"2026-01-28",endDate:"2026-02-02",tag:"휴일"},{id:"notice-2026-02-25",title:"2월 25일 특별휴일 운행",body:"특별 휴일 시간표가 적용됩니다.",startDate:"2026-02-24",endDate:"2026-02-26",tag:"공지"}],V=[{id:"wolpyeong",name:"월평-본교-시내 순환셔틀",stops:[{routeId:"wolpyeong",stopId:"stop-1"}]},{id:"wolpyeong-early",name:"월평-유성온천역-본교 (얼리월평 셔틀)",stops:[{routeId:"wolpyeong-early",stopId:"stop-1"}]},{id:"campus-loop",name:"본교-문지-화암 왕복셔틀",stops:[{routeId:"campus-loop",stopId:"stop-2"}]},{id:"olev",name:"OLEV 교내셔틀",stops:[{routeId:"olev",stopId:"stop-1"}]}],U={destinations:V},q="kaist-bus-favorites",P="kaist-bus-theme",y="kaist-bus-night-sky",E="kaist-bus-card-glow";let m=null;const X="campus-loop",O=[{id:"main",label:"본교",match:/본교/},{id:"munji",label:"문지",match:/문지/},{id:"hwaam",label:"화암",match:/화암/}],c={now:new Date,serviceDay:"weekday",holidayLabel:"",selectedRouteId:"",selectedStopId:"",selectedDestinationId:""};function S(){try{const t=localStorage.getItem(q);return t?JSON.parse(t):[]}catch{return[]}}function w(t){return(t==null?void 0:t.id)===X}function k(t){var n;return((n=O.find(o=>o.id===t))==null?void 0:n.label)||t}function L(t){const n=O.find(o=>o.match.test(t));return n?n.id:null}function z(t,n){const o=L(t[n].name);for(let e=n+1;e<t.length;e+=1){const s=L(t[e].name);if(s&&s!==o)return s}return null}function H(t,n,o){const e=t.stops||[],s=e.map((a,l)=>({stop:a,index:l,campus:L(a.name)})).filter(a=>a.campus===n);if(!s.length)return e[0];const i=s.filter(a=>/출발/.test(a.stop.name)),r=i.length?i:s;if(o){const a=r.find(l=>z(e,l.index)===o);if(a)return a.stop}return r[0].stop}function A(t){localStorage.setItem(q,JSON.stringify(t))}function R(t){var o;const n=F(t);return _.forcedWeekends.includes(n)?{day:"weekend",label:((o=_.labels)==null?void 0:o[n])||"휴일"}:K(t)?{day:"weekend",label:"주말"}:{day:"weekday",label:"평일"}}function Q(){try{return localStorage.getItem(P)}catch{return null}}function Z(t){try{localStorage.setItem(P,t)}catch{}}function $(t){const n=Q();let o=!0;if(n==="dark")o=!1;else if(n==="light")o=!0;else{const e=t.getHours();o=e>=6&&e<18}document.body.classList.toggle("theme-night",!o),o?document.documentElement.style.removeProperty("--night-sky"):tt()}function tt(){if(!m&&window.__nightSkyCss&&(m=window.__nightSkyCss),!m)try{m=localStorage.getItem(y)||sessionStorage.getItem(y)}catch{m=null}if(!m){m=et();try{localStorage.setItem(y,m),sessionStorage.setItem(y,m)}catch{}}window.__nightSkyCss=m,document.documentElement.style.setProperty("--night-sky",m)}function et(){const t=[],o=typeof window<"u"?window.innerWidth:1200,e=typeof window<"u"?window.innerHeight:800;for(let s=0;s<28;s+=1){const i=Math.floor(Math.random()*o),r=Math.floor(Math.random()*e),a=(Math.random()*1.8+.6).toFixed(2),l=(Math.random()*.5+.35).toFixed(2),u=Math.random()<.25?`rgba(255, 238, 180, ${l})`:`rgba(255, 255, 255, ${l})`;t.push(`radial-gradient(circle at ${i}px ${r}px, ${u} 0 ${a}px, transparent ${(Number(a)+1.6).toFixed(2)}px)`)}if(Math.random()<.65){const s=Math.floor(Math.random()*o),i=Math.floor(Math.random()*(e*.6));t.push(`radial-gradient(circle at ${s}px ${i}px, rgba(255, 244, 190, 0.95) 0 4px, transparent 7px)`)}return t.push("linear-gradient(180deg, #05070f 0%, #0b1026 55%, #141b3f 100%)"),t.join(", ")}function nt(){const t=()=>Math.random()<.7?Math.random()<.5?-15+Math.random()*20:95+Math.random()*20:15+Math.random()*70,n=(s,i)=>{const r=Math.round(t()),a=Math.round(t()),l=Math.floor(420+Math.random()*420),d=Math.floor(320+Math.random()*360),u=(i+Math.random()*.06).toFixed(2);return`radial-gradient(${l}px ${d}px at ${r}% ${a}%, rgba(${s}, ${u}), transparent 72%)`},o=["246, 226, 138","255, 181, 201","171, 228, 255","160, 255, 224","198, 176, 255","255, 214, 165"],e=[];for(let s=0;s<10;s+=1){const i=o[s%o.length];e.push(n(i,.045))}return e}function M(){if(!document.body.classList.contains("theme-night"))return;const t=document.querySelectorAll(".hero-card, .next-card, .notice-card, .route-card, .time-table");let n={};try{n=JSON.parse(sessionStorage.getItem(E)||"{}")}catch{n={}}const o=s=>s.classList.contains("hero-card")?"hero":s.classList.contains("next-card")?"next":s.classList.contains("notice-card")?"notice":s.classList.contains("route-card")?"route":s.classList.contains("time-table")?"table":"card",e=location.pathname.replace(/\W+/g,"")||"index";t.forEach((s,i)=>{const r=o(s),a=`${e}:${r}:${i}`;n[a]||(n[a]=nt());const[l,d,u]=n[a];s.style.setProperty("--card-glow-1",l),s.style.setProperty("--card-glow-2",d),s.style.setProperty("--card-glow-3",u)});try{sessionStorage.setItem(E,JSON.stringify(n))}catch{}}function j(t){const n=["olev","campus-loop","wolpyeong","wolpyeong-early"];return b.routes.filter(o=>o.stops.some(e=>{var s,i;return(i=(s=e.times)==null?void 0:s[t])==null?void 0:i.length})).sort((o,e)=>{const s=n.indexOf(o.id),i=n.indexOf(e.id),r=s===-1?Number.MAX_SAFE_INTEGER:s,a=i===-1?Number.MAX_SAFE_INTEGER:i;return r!==a?r-a:o.name.localeCompare(e.name)})}function ot(t){return t.find(n=>n.stops.some(o=>o.default))||t[0]}function T(){const t=document.querySelector("[data-clock]"),n=document.querySelector("[data-date]"),o=document.querySelector("[data-weekday]"),e=document.querySelector("[data-weekday-badge]");if(!t||!n||!o)return;c.now=new Date,t.textContent=B(c.now),n.textContent=W(c.now),o.textContent=Y(c.now);const{day:s,label:i}=R(c.now);c.serviceDay=s,c.holidayLabel=i,e&&(e.textContent=s==="weekday"?"평일":"휴일"),$(c.now)}function st(){const t=document.querySelector("#noticeList");if(!t)return;const n=F(c.now),o=J.filter(e=>(!e.startDate||e.startDate<=n)&&(!e.endDate||e.endDate>=n));t.innerHTML=o.length?o.map(e=>`
          <article class="notice-card">
            <div class="notice-tag">${e.tag||"공지"}</div>
            <h3>${e.title}</h3>
            <p>${e.body}</p>
            <span class="notice-date">${e.startDate||""}</span>
          </article>
        `).join(""):`
        <div class="notice-empty">
          현재 등록된 공지가 없습니다.
        </div>
      `}function at(t){const n=document.querySelector("#routeList");n&&(n.innerHTML=t.map(o=>`
      <a class="route-card" href="./route.html?route=${o.id}">
        <div>
          <h3>${o.name}</h3>
          <p>${o.subtitle||""}</p>
        </div>
        <div class="route-tags">
          ${(o.tags||[]).map(e=>`<span>${e}</span>`).join("")}
        </div>
      </a>
    `).join(""))}function x(t){const n=document.querySelector("#favoritesList");n&&(n.innerHTML="");const o=document.querySelector("#favoriteDockPanel"),e=document.querySelector("#favoriteDock"),s=document.querySelector("[data-favorite-tab]");if(!o)return;let i=S();if(!i.length){if(o.innerHTML=`
      <div class="favorite-dock__empty">
        즐겨찾기가 비어 있어요. 상단의 "즐겨찾기 추가" 버튼으로 등록해 주세요.
      </div>
    `,o.setAttribute("aria-live","polite"),e&&e.classList.add("is-empty"),s){const d=e==null?void 0:e.classList.contains("is-open");s.classList.toggle("is-active",!!d)}return}e&&e.classList.remove("is-empty"),o.style.display="";const r=c.now.getHours()*60+c.now.getMinutes(),a=[],l=i.map(d=>{var I;const u=b.routes.find(h=>h.id===d.routeId);if(!u)return"";let p=u.stops.find(h=>h.id===d.stopId);if(w(u)&&d.campusFrom&&(p=p||H(u,d.campusFrom,d.campusTo)),!p)return"";a.push(d);const g=((I=p.times)==null?void 0:I[c.serviceDay])||[],f=N(g,r-2,2),D=g[g.length-1],G=w(u)&&d.campusFrom?`${k(d.campusFrom)} → ${k(d.campusTo)}`:p.direction&&p.direction!==u.name?`${v(u.id,p.name)} → ${p.direction}`:`${v(u.id,p.name)}`;return`
        <div class="favorite-dock__item" data-fav="${d.key}">
          <div class="favorite-dock__title">
            <span>${u.name}</span>
            <span>${G}</span>
          </div>
          <div class="favorite-dock__row">
            <div class="favorite-dock__times">
              ${f.map(h=>`
                  <span>
                    ${h}
                    ${D&&h===D?'<em class="last-tag">막차</em>':""}
                  </span>
                `).join("")}
            </div>
            <button class="favorite-dock__remove" type="button" data-remove-favorite="${d.key}">
              삭제
            </button>
          </div>
        </div>
      `}).filter(Boolean);if(a.length!==i.length&&(i=a,A(a)),!l.length){o.innerHTML=`
      <div class="favorite-dock__empty">
        즐겨찾기가 비어 있어요. 상단의 "즐겨찾기 추가" 버튼으로 등록해 주세요.
      </div>
    `,e&&e.classList.add("is-empty"),s&&s.classList.remove("is-active");return}o.innerHTML=l.join("")}function C(t){const n=document.querySelector("#nextDepartures");if(!n)return;const o=S().slice(0,3);if(!o.length){n.innerHTML=`
      <div class="next-empty">
        즐겨찾기한 노선이 아직 없어요. 노선 상세에서 즐겨찾기를 추가하면
        여기에서 가까운 출발을 빠르게 확인할 수 있어요.
      </div>
    `,x(),M();return}const e=c.now.getHours()*60+c.now.getMinutes(),s=o.map(i=>{var g;const r=b.routes.find(f=>f.id===i.routeId);if(!r)return"";let a=r.stops.find(f=>f.id===i.stopId);if(w(r)&&i.campusFrom&&(a=a||H(r,i.campusFrom,i.campusTo)),!a)return"";const l=((g=a.times)==null?void 0:g[c.serviceDay])||[],d=N(l,e-2,4),u=l[l.length-1],p=w(r)&&i.campusFrom?`${k(i.campusFrom)} → ${k(i.campusTo)}`:a.direction&&a.direction!==r.name?`${v(r.id,a.name)} → ${a.direction}`:`${v(r.id,a.name)}`;return`
        <div class="next-card">
          <div class="next-header">
            <div>
              <h3>${r.name}</h3>
              <p>${p}</p>
            </div>
            <span class="next-badge">시간표 기준</span>
          </div>
          <div class="next-list">
            ${d.map(f=>`
                <div class="next-chip">
                  ${f}
                  ${u&&f===u?'<span class="last-tag">막차</span>':""}
                </div>
              `).join("")}
          </div>
          <p class="next-note">실시간 위치 아님 · 실제 운행과 차이 가능</p>
        </div>
      `}).filter(Boolean).join("");n.innerHTML=s||`
    <div class="next-empty">
      즐겨찾기한 노선이 아직 없어요. 노선 상세에서 즐겨찾기를 추가하면
      여기에서 가까운 출발을 빠르게 확인할 수 있어요.
    </div>
  `,x(),M()}function it(){const t=document.querySelector("[data-theme-toggle]");t&&(t.addEventListener("click",()=>{const n=document.body.classList.contains("theme-night");Z(n?"light":"dark"),$(new Date)}),$(new Date))}function rt(){const t=document.querySelector("#favoriteDock"),n=document.querySelector("[data-favorite-tab]"),o=document.querySelector("#favoriteDockPanel");if(!t||!n)return;let e=!1;const s=()=>{n.classList.toggle("is-active",t.classList.contains("is-open"))},i=()=>{t.classList.add("is-open"),s()},r=()=>{e||(t.classList.remove("is-open"),s())};t.addEventListener("mouseenter",()=>i()),t.addEventListener("mouseleave",()=>r()),n.addEventListener("mouseenter",()=>i()),n.addEventListener("mouseleave",()=>r()),t.addEventListener("click",()=>{e=!e,e?(t.classList.add("is-open"),s()):(t.classList.remove("is-open"),s())}),n.addEventListener("click",()=>{e=!e,e?(t.classList.add("is-open"),s()):(t.classList.remove("is-open"),s())}),document.addEventListener("click",a=>{window.matchMedia("(max-width: 640px)").matches||t.classList.contains("is-open")&&(t.contains(a.target)||n.contains(a.target)||(e=!1,t.classList.remove("is-open"),s()))}),o&&o.addEventListener("click",a=>{a.stopPropagation();const l=a.target.closest("[data-remove-favorite]");if(!l)return;const d=l.dataset.removeFavorite;if(!d)return;const u=S().filter(p=>p.key!==d);A(u),x(j(c.serviceDay))}),s()}function ct(){const{day:t}=R(c.now);c.serviceDay=t;const n=j(c.serviceDay);if(n.length===0)return;const o=S();if(o.length){c.selectedRouteId=o[0].routeId,c.selectedStopId=o[0].stopId;const e=b.routes.find(r=>r.id===c.selectedRouteId),s=e==null?void 0:e.stops.find(r=>r.id===c.selectedStopId),i=U.destinations.find(r=>r.name===(s==null?void 0:s.direction));i&&(c.selectedDestinationId=i.id)}else c.selectedRouteId=ot(n).id;T(),st(),at(n),C(),M(),it(),rt(),setInterval(()=>{T(),C()},1e3)}ct();
