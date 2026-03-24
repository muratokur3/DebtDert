import re

files_to_check = {
    "src/components/PhoneInput.tsx": [
        ('type="tel"', 'inputMode="numeric"')
    ],
    "src/components/QuickTransactionModal.tsx": [
        ('type="number"', 'inputMode="decimal"')
    ],
    "src/components/CreateDebtModal.tsx": [
        ('type="number"', 'inputMode="decimal"'),
        ('type="number"', 'inputMode="numeric"')
    ],
    "src/components/EditDebtModal.tsx": [
        ('type="number"', 'inputMode="decimal"')
    ],
    "src/pages/ExchangeRates.tsx": [
        ('type="number"', 'inputMode="decimal"')
    ]
}

def check_files():
    all_passed = True
    for file, expected_pairs in files_to_check.items():
        try:
            with open(file, 'r') as f:
                content = f.read()

            for type_attr, input_mode_attr in expected_pairs:
                if type_attr in content and input_mode_attr in content:
                     print(f"PASSED: {file} contains both {type_attr} and {input_mode_attr}")
                else:
                     print(f"FAILED: {file} is missing {type_attr} or {input_mode_attr}")
                     all_passed = False
        except Exception as e:
            print(f"ERROR: Could not read {file}: {e}")
            all_passed = False

    if all_passed:
        print("\nAll inputMode validations passed successfully!")
    else:
        print("\nSome inputMode validations failed.")
        exit(1)

if __name__ == "__main__":
    check_files()
