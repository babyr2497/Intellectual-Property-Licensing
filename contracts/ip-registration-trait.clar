;; IP Registration Trait
;; Defines the interface for the IP Registration contract

(define-trait ip-registration-trait
  (
    ;; Get IP information
    (get-ip (uint) (response (optional {
      owner: principal,
      title: (string-utf8 256),
      description: (string-utf8 1024),
      ip-type: (string-utf8 64),
      creation-date: uint,
      registration-date: uint
    }) uint))

    ;; Get owner's IPs
    (get-owner-ips (principal) (response {
      ip-ids: (list 100 uint)
    } uint))

    ;; Register new IP
    (register-ip ((string-utf8 256) (string-utf8 1024) (string-utf8 64)) (response uint uint))

    ;; Transfer IP ownership
    (transfer-ip (uint principal) (response bool uint))
  )
)

