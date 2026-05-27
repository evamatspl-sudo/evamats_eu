const outputNode = document.querySelector(".js-discount-output");
const discountValue = outputNode.querySelector(".js-discount-value");
const loadingNode = outputNode.querySelector(".js-loading");

const url = "https://creatediscount.me/api/send";

const showLoading = () => {
    loadingNode.style.display = "block";
};

const hideLoading = () => {
    loadingNode.style.display = "none";
};

const displayError = (element, message) => {
    element.parentElement.querySelector(".js-error").innerHTML = message;
};

const clearError = (element) => {
    element.parentElement.querySelector(".js-error").innerHTML = "";
};

const fetchData = async (total_price, part_payment) => {
    showLoading();
  total_price = total_price.slice(0, -2)

    let response = await fetch(url, {
        method: "POST",
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            total_price,
            part_payment,
        }),
    });

    hideLoading();

    if (response.ok) {
        const data = await response.json();
        discountValue.innerHTML = data;
        discountValue.style.display = "block";
    } else {
        discountValue.innerHTML = "Something went wrong, try later.";
    }
};

const validateInput = (element) => {
    const value = element.value;
    if (!value) {
        displayError(element, `Please fill in ${element.name}.`);
        return false;
    }
    clearError(element);
    return true;
};

const handleSubmitForm = async () => {
    discountValue.innerHTML = "";

    const total_price = document.getElementById("total_price");
    const part_payment = document.getElementById("part_payment");

    const isTotalPriceValid = validateInput(total_price);
    const isPartPaymentValid = validateInput(part_payment);

    if (isTotalPriceValid && isPartPaymentValid) {
        await fetchData((total_price.value).split(',')[0], part_payment.value);
    }
};

const discountForm = document.getElementById("discount-form");
discountForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSubmitForm();
});
function змінитиМісткість() {
  // Отримати елемент .docapp-left
  const leftElement = document.querySelector('.docapp-left');

  // Перевірити, чи елемент існує
  if (leftElement) {
    // Очистити місткість елементу .docapp-left
    leftElement.innerHTML = '';

    // Створити новий елемент <strong> з текстом "Płatność pocztą:"
    const strongElement = document.createElement('strong');
    strongElement.textContent = 'Płatność pocztą:';

    // Додати новий елемент до .docapp-left
    leftElement.appendChild(strongElement);
  }
}

// Знаходить кнопку з класом .docapp-coupon-input--button-text і додає до неї обробник кліку
const button = document.querySelector('.docapp-coupon-input--button-text');
if (button) {
  button.addEventListener('click', змінитиМісткість);
}
