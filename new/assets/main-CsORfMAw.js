import{r as L,t as F,h as I,i as B,f as K,a as W,b as Y,g as q,c as w}from"./stopLabels-EZMPmHTw.js";const J=[{id:"notice-2026-02-01",title:"2월 1일 설 연휴 운행 안내",body:"해당일은 휴일 시간표로 운행됩니다. 출발 전 꼭 시간표를 확인해 주세요.",startDate:"2026-01-28",endDate:"2026-02-02",tag:"휴일"},{id:"notice-2026-02-25",title:"2월 25일 특별휴일 운행",body:"특별 휴일 시간표가 적용됩니다.",startDate:"2026-02-24",endDate:"2026-02-26",tag:"공지"}],V=[{id:"wolpyeong",name:"월평-본교-시내 순환셔틀",stops:[{routeId:"wolpyeong",stopId:"stop-1"}]},{id:"wolpyeong-early",name:"월평-유성온천역-본교 (얼리월평 셔틀)",stops:[{routeId:"wolpyeong-early",stopId:"stop-1"}]},{id:"campus-loop",name:"본교-문지-화암 왕복셔틀",stops:[{routeId:"campus-loop",stopId:"stop-2"}]},{id:"olev",name:"OLEV 교내셔틀",stops:[{routeId:"olev",stopId:"stop-1"}]}],z={destinations:V},A="kaist-bus-favorites",N="kaist-bus-theme",v="kaist-bus-night-sky",C="kaist-bus-card-glow";let y=null;const U="campus-loop",P=[{id:"main",label:"본교",match:/본교/},{id:"munji",label:"문지",match:/문지/},{id:"hwaam",label:"화암",match:/화암/}],l={now:new Date,serviceDay:"weekday",holidayLabel:"",selectedRouteId:"",selectedStopId:"",selectedDestinationId:""};function S(){try{const t=localStorage.getItem(A);return t?JSON.parse(t):[]}catch{return[]}}function k(t){return(t==null?void 0:t.id)===U}function b(t){var e;return((e=P.find(o=>o.id===t))==null?void 0:e.label)||t}function $(t){const e=P.find(o=>o.match.test(t));return e?e.id:null}function X(t,e){const o=$(t[e].name);for(let n=e+1;n<t.length;n+=1){const s=$(t[n].name);if(s&&s!==o)return s}return null}function O(t,e,o){const n=t.stops||[],s=n.map((a,d)=>({stop:a,index:d,campus:$(a.name)})).filter(a=>a.campus===e);if(!s.length)return n[0];const r=s.filter(a=>/출발/.test(a.stop.name)),i=r.length?r:s;if(o){const a=i.find(d=>X(n,d.index)===o);if(a)return a.stop}return i[0].stop}function H(t){localStorage.setItem(A,JSON.stringify(t))}function R(t){var o;const e=F(t);return I.forcedWeekends.includes(e)?{day:"weekend",label:((o=I.labels)==null?void 0:o[e])||"휴일"}:B(t)?{day:"weekend",label:"주말"}:{day:"weekday",label:"평일"}}function Q(){try{return localStorage.getItem(N)}catch{return null}}function Z(t){try{localStorage.setItem(N,t)}catch{}}function x(t){const e=Q();let o=!0;if(e==="dark")o=!1;else if(e==="light")o=!0;else{const s=t.getHours();o=s>=6&&s<18}document.body.classList.toggle("theme-night",!o);const n=document.querySelector('meta[name="theme-color"]');n&&n.setAttribute("content",o?"#f5f5fb":"#05070f"),o?document.documentElement.style.removeProperty("--night-sky"):tt()}function tt(){if(!y&&window.__nightSkyCss&&(y=window.__nightSkyCss),!y)try{y=localStorage.getItem(v)||sessionStorage.getItem(v)}catch{y=null}if(!y){y=et();try{localStorage.setItem(v,y),sessionStorage.setItem(v,y)}catch{}}window.__nightSkyCss=y,document.documentElement.style.setProperty("--night-sky",y)}function et(){const t=[],o=typeof window<"u"?window.innerWidth:1200,n=typeof window<"u"?window.innerHeight:800;for(let s=0;s<28;s+=1){const r=Math.floor(Math.random()*o),i=Math.floor(Math.random()*n),a=(Math.random()*1.8+.6).toFixed(2),d=(Math.random()*.5+.35).toFixed(2),u=Math.random()<.25?`rgba(255, 238, 180, ${d})`:`rgba(255, 255, 255, ${d})`;t.push(`radial-gradient(circle at ${r}px ${i}px, ${u} 0 ${a}px, transparent ${(Number(a)+1.6).toFixed(2)}px)`)}if(Math.random()<.65){const s=Math.floor(Math.random()*o),r=Math.floor(Math.random()*(n*.6));t.push(`radial-gradient(circle at ${s}px ${r}px, rgba(255, 244, 190, 0.95) 0 4px, transparent 7px)`)}return t.push("linear-gradient(180deg, #05070f 0%, #0b1026 55%, #141b3f 100%)"),t.join(", ")}function nt(){const t=()=>Math.random()<.7?Math.random()<.5?-15+Math.random()*20:95+Math.random()*20:15+Math.random()*70,e=(s,r)=>{const i=Math.round(t()),a=Math.round(t()),d=Math.floor(420+Math.random()*420),c=Math.floor(320+Math.random()*360),u=(r+Math.random()*.06).toFixed(2);return`radial-gradient(${d}px ${c}px at ${i}% ${a}%, rgba(${s}, ${u}), transparent 72%)`},o=["246, 226, 138","255, 181, 201","171, 228, 255","160, 255, 224","198, 176, 255","255, 214, 165"],n=[];for(let s=0;s<10;s+=1){const r=o[s%o.length];n.push(e(r,.045))}return n}function M(){if(!document.body.classList.contains("theme-night"))return;const t=document.querySelectorAll(".hero-card, .next-card, .notice-card, .route-card, .time-table");let e={};try{e=JSON.parse(sessionStorage.getItem(C)||"{}")}catch{e={}}const o=s=>s.classList.contains("hero-card")?"hero":s.classList.contains("next-card")?"next":s.classList.contains("notice-card")?"notice":s.classList.contains("route-card")?"route":s.classList.contains("time-table")?"table":"card",n=location.pathname.replace(/\W+/g,"")||"index";t.forEach((s,r)=>{const i=o(s),a=`${n}:${i}:${r}`;e[a]||(e[a]=nt());const[d,c,u]=e[a];s.style.setProperty("--card-glow-1",d),s.style.setProperty("--card-glow-2",c),s.style.setProperty("--card-glow-3",u)});try{sessionStorage.setItem(C,JSON.stringify(e))}catch{}}function j(t){const e=["olev","campus-loop","wolpyeong","wolpyeong-early"];return L.routes.filter(o=>o.stops.some(n=>{var s,r;return(r=(s=n.times)==null?void 0:s[t])==null?void 0:r.length})).sort((o,n)=>{const s=e.indexOf(o.id),r=e.indexOf(n.id),i=s===-1?Number.MAX_SAFE_INTEGER:s,a=r===-1?Number.MAX_SAFE_INTEGER:r;return i!==a?i-a:o.name.localeCompare(n.name)})}function ot(t){return t.find(e=>e.stops.some(o=>o.default))||t[0]}function _(){const t=document.querySelectorAll("[data-clock]"),e=document.querySelectorAll("[data-date]"),o=document.querySelectorAll("[data-weekday]"),n=document.querySelectorAll("[data-clock-card]"),s=document.querySelectorAll("[data-date-card]"),r=document.querySelectorAll("[data-weekday-card]"),i=document.querySelector("[data-weekday-badge]");if(!t.length||!e.length||!o.length)return;l.now=new Date;const a=K(l.now);t.forEach(m=>{m.textContent=a}),n.forEach(m=>{m.textContent=a});const c=W(l.now).replace(/^\d{4}년\s*/,"");e.forEach(m=>{m.textContent=c}),s.forEach(m=>{m.textContent=c});const{day:u,label:p}=R(l.now);l.serviceDay=u,l.holidayLabel=p;const f=u==="weekday"?"평일":"휴일",h=Y(l.now);o.forEach(m=>{m.textContent=`${h} (${f}) ·`}),r.forEach(m=>{m.textContent=h}),i&&(i.textContent=f),x(l.now)}function st(){const t=document.querySelector("#noticeList");if(!t)return;const e=F(l.now),o=J.filter(n=>(!n.startDate||n.startDate<=e)&&(!n.endDate||n.endDate>=e));t.innerHTML=o.length?o.map(n=>`
          <article class="notice-card">
            <div class="notice-tag">${n.tag||"공지"}</div>
            <h3>${n.title}</h3>
            <p>${n.body}</p>
            <span class="notice-date">${n.startDate||""}</span>
          </article>
        `).join(""):`
        <div class="notice-empty">
          현재 등록된 공지가 없습니다.
        </div>
      `}function at(t){const e=document.querySelector("#routeList");e&&(e.innerHTML=t.map(o=>`
      <a class="route-card" href="./route.html?route=${o.id}">
        <div>
          <h3>${o.name}</h3>
          <p>${o.subtitle||""}</p>
        </div>
        <div class="route-tags">
          ${(o.tags||[]).map(n=>`<span>${n}</span>`).join("")}
        </div>
      </a>
    `).join(""))}function D(t){const e=document.querySelector("#favoritesList");e&&(e.innerHTML="");const o=document.querySelector("#favoriteDockPanel"),n=document.querySelector("#favoriteDock"),s=document.querySelector("[data-favorite-tab]");if(!o)return;let r=S();if(!r.length){if(o.innerHTML=`
      <div class="favorite-dock__empty">
        즐겨찾기가 비어 있어요. 상단의 "즐겨찾기 추가" 버튼으로 등록해 주세요.
      </div>
    `,o.setAttribute("aria-live","polite"),n&&n.classList.add("is-empty"),s){const c=n==null?void 0:n.classList.contains("is-open");s.classList.toggle("is-active",!!c)}return}n&&n.classList.remove("is-empty"),o.style.display="";const i=l.now.getHours()*60+l.now.getMinutes(),a=[],d=r.map(c=>{var E;const u=L.routes.find(g=>g.id===c.routeId);if(!u)return"";let p=u.stops.find(g=>g.id===c.stopId);if(k(u)&&c.campusFrom&&(p=p||O(u,c.campusFrom,c.campusTo)),!p)return"";a.push(c);const f=((E=p.times)==null?void 0:E[l.serviceDay])||[],h=q(f,i-2,2),m=f[f.length-1],G=k(u)&&c.campusFrom?`${b(c.campusFrom)} → ${b(c.campusTo)}`:p.direction&&p.direction!==u.name?`${w(u.id,p.name)} → ${p.direction}`:`${w(u.id,p.name)}`;return`
        <div class="favorite-dock__item" data-fav="${c.key}">
          <div class="favorite-dock__title">
            <span>${u.name}</span>
            <span>${G}</span>
          </div>
          <div class="favorite-dock__row">
            <div class="favorite-dock__times">
              ${h.map(g=>`
                  <span>
                    ${g}
                    ${m&&g===m?'<em class="last-tag">막차</em>':""}
                  </span>
                `).join("")}
            </div>
            <button class="favorite-dock__remove" type="button" data-remove-favorite="${c.key}">
              삭제
            </button>
          </div>
        </div>
      `}).filter(Boolean);if(a.length!==r.length&&(r=a,H(a)),!d.length){o.innerHTML=`
      <div class="favorite-dock__empty">
        즐겨찾기가 비어 있어요. 상단의 "즐겨찾기 추가" 버튼으로 등록해 주세요.
      </div>
    `,n&&n.classList.add("is-empty"),s&&s.classList.remove("is-active");return}o.innerHTML=d.join("")}function T(t){const e=document.querySelector("#nextDepartures");if(!e)return;const o=S().slice(0,3);if(!o.length){e.innerHTML=`
      <div class="next-empty">
        즐겨찾기한 노선이 아직 없어요. 노선 상세에서 즐겨찾기를 추가하면
        여기에서 가까운 출발을 빠르게 확인할 수 있어요.
      </div>
    `,D(),M();return}const n=l.now.getHours()*60+l.now.getMinutes(),s=o.map(r=>{var f;const i=L.routes.find(h=>h.id===r.routeId);if(!i)return"";let a=i.stops.find(h=>h.id===r.stopId);if(k(i)&&r.campusFrom&&(a=a||O(i,r.campusFrom,r.campusTo)),!a)return"";const d=((f=a.times)==null?void 0:f[l.serviceDay])||[],c=q(d,n-2,4),u=d[d.length-1],p=k(i)&&r.campusFrom?`${b(r.campusFrom)} → ${b(r.campusTo)}`:a.direction&&a.direction!==i.name?`${w(i.id,a.name)} → ${a.direction}`:`${w(i.id,a.name)}`;return`
        <div class="next-card">
          <div class="next-header">
            <div>
              <h3>${i.name}</h3>
              <p>${p}</p>
            </div>
            <span class="next-badge">시간표 기준</span>
          </div>
          <div class="next-list">
            ${c.map(h=>`
                <div class="next-chip">
                  ${h}
                  ${u&&h===u?'<span class="last-tag">막차</span>':""}
                </div>
              `).join("")}
          </div>
          <p class="next-note">실시간 위치 아님 · 실제 운행과 차이 가능</p>
        </div>
      `}).filter(Boolean).join("");e.innerHTML=s||`
    <div class="next-empty">
      즐겨찾기한 노선이 아직 없어요. 노선 상세에서 즐겨찾기를 추가하면
      여기에서 가까운 출발을 빠르게 확인할 수 있어요.
    </div>
  `,D(),M()}function rt(){const t=document.querySelector("[data-theme-toggle]");t&&(t.addEventListener("click",()=>{const e=document.body.classList.contains("theme-night");Z(e?"light":"dark"),x(new Date)}),x(new Date))}function it(){const t=document.querySelector("#favoriteDock"),e=document.querySelector("[data-favorite-tab]"),o=document.querySelector("#favoriteDockPanel");if(!t||!e)return;let n=!1;const s=()=>{e.classList.toggle("is-active",t.classList.contains("is-open"))},r=()=>{t.classList.add("is-open"),s(),a()},i=()=>{n||(t.classList.remove("is-open"),s())};t.addEventListener("mouseenter",()=>r()),t.addEventListener("mouseleave",()=>i()),e.addEventListener("mouseenter",()=>r()),e.addEventListener("mouseleave",()=>i()),t.addEventListener("click",()=>{n=!n,n?(t.classList.add("is-open"),s()):(t.classList.remove("is-open"),s())}),e.addEventListener("click",()=>{n=!n,n?(t.classList.add("is-open"),s()):(t.classList.remove("is-open"),s())});const a=()=>{if(!window.matchMedia("(max-width: 640px)").matches||!t.classList.contains("is-open"))return;const c=e.getBoundingClientRect();t.style.top=`${Math.round(c.bottom+8)}px`};document.addEventListener("click",d=>{t.classList.contains("is-open")&&(t.contains(d.target)||e.contains(d.target)||(n=!1,t.classList.remove("is-open"),s()))}),o&&o.addEventListener("click",d=>{d.stopPropagation();const c=d.target.closest("[data-remove-favorite]");if(!c)return;const u=c.dataset.removeFavorite;if(!u)return;const p=S().filter(f=>f.key!==u);H(p),D(j(l.serviceDay))}),s(),window.addEventListener("scroll",a,{passive:!0}),window.addEventListener("resize",a),e.addEventListener("click",a),t.addEventListener("mouseenter",a)}function ct(){const{day:t}=R(l.now);l.serviceDay=t;const e=j(l.serviceDay);if(e.length===0)return;const o=S();if(o.length){l.selectedRouteId=o[0].routeId,l.selectedStopId=o[0].stopId;const n=L.routes.find(i=>i.id===l.selectedRouteId),s=n==null?void 0:n.stops.find(i=>i.id===l.selectedStopId),r=z.destinations.find(i=>i.name===(s==null?void 0:s.direction));r&&(l.selectedDestinationId=r.id)}else l.selectedRouteId=ot(e).id;_(),st(),at(e),T(),M(),rt(),it(),setInterval(()=>{_(),T()},1e3)}ct();
