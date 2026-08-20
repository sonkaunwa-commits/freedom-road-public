(()=>{
const MAP={
 '第二章 中国金融体系与多层次资本市场':'第二章 中国的金融体系与多层次资本市场',
 '第七章 金融衍生工具':'第七章 金融衍生品',
 '第四章 典型违法违规行为及法律责任':'第四章 证券市场典型违法违规行为及法律责任',
 '第五章 行业文化、职业道德与从业人员行业规范':'第五章 行业文化、职业道德与从业人员行为规范'
};
for(const q of (window.SEC_QUESTIONS||[]))if(MAP[q.ch])q.ch=MAP[q.ch];
window.SEC_CHAPTER_NORMALIZED=true;
})();
