
router.post("/redeem", async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    return res
      .status(400)
      .json({ error: "Token is required and must be a string" });
  }

  try {
    const voucher = await Voucher.findOne({ token });

    if (!voucher) {
      return res
        .status(404)
        .json({ status: "invalid", message: "Voucher not found" });
    }

    if (voucher.redeemed) {
      return res.status(400).json({
        status: "redeemed",
        message: "Voucher has already been redeemed",
      });
    }

    const expiryDate = new Date(voucher.expiryDate);
    const currentDate = new Date();

    if (expiryDate < currentDate) {
      return res
        .status(400)
        .json({ status: "expired", message: "Voucher has expired" });
    }

    voucher.redeemed = true;
    await voucher.save();

    return res.json({
      status: "redeemed",
      message: "Voucher has been successfully redeemed",
    });
  } catch (error) {
    console.error("Error redeeming voucher:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// Route to verify vendor PIN
router.post("/login", async (req: Request, res: Response) => {
  const { vendorId, pin } = req.body;

  if (!vendorId || typeof vendorId !== "string") {
    return res.status(400).json({ error: "Vendor ID is required" });
  }

  if (!pin || typeof pin !== "number") {
    return res
      .status(400)
      .json({ error: "PIN is required and must be a number" });
  }

  try {
    const vendor = await Vendor.findOne({ vendorId });

    if (!vendor) {
      return res
        .status(404)
        .json({ status: "invalid", message: "Vendor not found" });
    }

    if (vendor.vendorPin !== pin) {
      return res
        .status(401)
        .json({ status: "invalid", message: "Incorrect PIN" });
    }

    // Return vendor details if PIN matches
    return res.json({
      status: "success",
      message: "PIN verified successfully",
      vendor: {
        vendorId: vendor.vendorId,
        // You can include other vendor details here if needed
      },
    });
  } catch (error) {
    console.error("Error verifying vendor PIN:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});