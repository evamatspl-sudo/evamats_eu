/* Deliberately read-only demo: selection is tab-local, not an order/checkout gift. */
(function (root) {
  'use strict';
  function evaluateGiftState(total, threshold, currency, campaignCurrency) {
    const valid = Number.isSafeInteger(total) && total >= 0 && Number.isSafeInteger(threshold) && threshold > 0 && currency === campaignCurrency;
    return {valid, eligible:valid && total >= threshold, remaining:valid ? Math.max(0,threshold-total) : 0, percent:valid ? Math.min(100,Math.max(0,Math.floor(total/threshold*100))) : 0};
  }
  if (typeof module === 'object' && module.exports) module.exports = {evaluateGiftState};
  if (!root?.customElements || root.customElements.get('carvion-gift-demo')) return;
  class GiftDemo extends root.HTMLElement {
    connectedCallback() {
      if (this.ready) return;
      this.ready = true;
      this.copy = JSON.parse(this.querySelector('[data-gift-copy]').textContent);
      this.cards = [...this.querySelectorAll('[data-gift-product]')];
      this.threshold = Number(this.dataset.threshold);
      this.realTotal = Number(this.dataset.total);
      this.scenario = 'actual';this.selected = null;
      this.key = ['carvion-gift-demo',this.dataset.theme,this.dataset.section,this.dataset.campaign,this.dataset.currency,this.threshold,this.cards.map(x=>x.dataset.giftProduct).join(',')].join(':');
      try {const saved=JSON.parse(sessionStorage.getItem(this.key));if(saved){this.selected=saved.selected;this.scenario=['actual','below','reached'].includes(saved.scenario)?saved.scenario:'actual';}} catch {}
      if (this.selected) {
        const card=this.cards.find(c=>c.dataset.giftProduct===this.selected.product);
        const input=card?.querySelector('[data-gift-variant]');
        if(input && (input.tagName!=='SELECT' ? input.value===this.selected.variant : [...input.options].some(o=>o.value===this.selected.variant&&!o.disabled)))input.value=this.selected.variant;else this.selected=null;
      }
      this.addEventListener('click', event => {
        const scenario=event.target.closest('[data-gift-scenario]');
        if(scenario){this.scenario=scenario.dataset.giftScenario;this.render();return;}
        if(event.target.closest('[data-gift-remove]')){this.selected=null;this.render();return;}
        const button=event.target.closest('[data-gift-select]');
        if(!button || button.disabled || !this.state?.eligible)return;
        const card=button.closest('[data-gift-product]');
        this.selected={product:card.dataset.giftProduct,variant:card.querySelector('[data-gift-variant]').value};
        this.render();
      });
      this.addEventListener('change',event=>{
        if(!event.target.matches('[data-gift-variant]'))return;
        const card=event.target.closest('[data-gift-product]');
        if(this.selected?.product===card.dataset.giftProduct)this.selected.variant=event.target.value;
        this.render();
      });
      this.render();
    }
    money(cents) {return new Intl.NumberFormat(document.documentElement.lang||'en',{style:'currency',currency:this.dataset.currency}).format(cents/100);}
    render() {
      const total=this.scenario==='below'?Math.floor(this.threshold*.8):this.scenario==='reached'?this.threshold:this.realTotal;
      this.state=evaluateGiftState(total,this.threshold,this.dataset.currency,this.dataset.campaignCurrency);
      const pool=this.cards.filter(c=>c.dataset.available==='true');
      if(!this.state.eligible||!pool.some(c=>c.dataset.giftProduct===this.selected?.product))this.selected=null;
      this.dataset.state=!this.state.valid?'error':!pool.length?'empty':this.selected?'selected':this.state.eligible?'ready':'locked';
      const text=!this.state.valid?this.copy.error:!pool.length?this.copy.empty:this.selected?this.copy.selected:this.state.eligible?this.copy.ready:this.copy.locked.replace('__AMOUNT__',this.money(this.state.remaining));
      this.querySelector('[data-gift-status]').textContent=text;
      this.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',String(this.state.percent));
      this.querySelector('[data-gift-fill]').style.transform=`scaleX(${this.state.percent/100})`;
      this.querySelector('[data-gift-amount]').textContent=(this.scenario==='actual'?this.copy.actual:this.copy.simulated)+' '+(this.state.valid?this.money(total):'—');
      for(const card of this.cards){
        const enabled=this.state.eligible&&card.dataset.available==='true',chosen=this.selected?.product===card.dataset.giftProduct;
        card.dataset.selected=String(chosen);
        const button=card.querySelector('[data-gift-select]');
        button.disabled=!enabled;button.setAttribute('aria-pressed',String(chosen));
        button.textContent=card.dataset.available!=='true'?this.copy.unavailable:chosen?this.copy.chosenButton:enabled?this.copy.choose:this.copy.lockedButton;
        card.querySelector('[data-gift-variant]').disabled=!enabled;
        card.querySelector('[data-gift-check]').hidden=!chosen;
      }
      const selection=this.querySelector('[data-gift-selection]');selection.hidden=!this.selected;
      if(this.selected){const card=this.cards.find(c=>c.dataset.giftProduct===this.selected.product),input=card.querySelector('[data-gift-variant]');this.querySelector('[data-gift-selected-title]').textContent=card.dataset.title+(input.tagName==='SELECT'?' · '+input.selectedOptions[0].textContent:'');}
      this.querySelectorAll('[data-gift-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.giftScenario===this.scenario)));
      try {sessionStorage.setItem(this.key,JSON.stringify({selected:this.selected,scenario:this.scenario}));} catch {}
    }
  }
  root.customElements.define('carvion-gift-demo',GiftDemo);
})(typeof window === 'undefined' ? null : window);
