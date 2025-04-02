;; Usage Tracking Trait
;; Defines the interface for the Usage Tracking contract

(define-trait usage-tracking-trait
  (
    ;; Get usage record
    (get-usage-record (uint) (response (optional {
      license-id: uint,
      licensee: principal,
      usage-type: (string-utf8 64),
      usage-amount: uint,
      timestamp: uint,
      verified: bool
    }) uint))

    ;; Get license usage records
    (get-license-usage-records (uint) (response {
      usage-ids: (list 1000 uint)
    } uint))

    ;; Get licensee usage records
    (get-licensee-usage-records (principal) (response {
      usage-ids: (list 1000 uint)
    } uint))

    ;; Record usage
    (record-usage (principal uint (string-utf8 64) uint) (response uint uint))

    ;; Verify usage
    (verify-usage (uint principal) (response bool uint))
  )
)

