const JOULE_TOKENS = [
  {
    assetName: "USDC",
    provider: "LayerZero USDC",
    token: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC",
    decimals: 1000000,
    isFungible: false
  },
  {
    assetName: "USDC",
    provider: "Circle USDC",
    token: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
    decimals: 1000000,
    isFungible: true
  },
  {
    assetName: "USDt",
    provider: "Tether USD",
    token: "0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b",
    decimals: 1000000,
    isFungible: true
  },
  {
    assetName: "StakedThalaAPT",
    provider: "Thala",
    token: "0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::staking::StakedThalaAPT",
    decimals: 100000000,
    isFungible: false
  },
  {
    assetName: "AptosCoin",
    provider: "AptosCoin",
    token: "0x1::aptos_coin::AptosCoin",
    decimals: 100000000,
    isFungible: false
  },
  {
    assetName: "WBTC",
    provider: "LayerZero WBTC",
    token: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WBTC",
    decimals: 1000000,
    isFungible: false
  },
  {
    assetName: "ABTC",
    provider: "Echo Protocol",
    token: "0x4e1854f6d332c9525e258fb6e66f84b6af8aba687bbcb832a24768c4e175feec::abtc::ABTC",
    decimals: 10000000000,
    isFungible: false
  },
  {
    assetName: "WETH",
    provider: "LayerZero WETH",
    token: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH",
    decimals: 1000000,
    isFungible: false
  },
  {
    assetName: "AmnisApt",
    provider: "Amnis Finance",
    token: "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt",
    decimals: 100000000,
    isFungible: false
  },
  {
    assetName: "StakedApt",
    provider: "Amnis Finance",
    token: "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt",
    decimals: 100000000,
    isFungible: false
  },
  {
    assetName: "TruAPT",
    provider: "TruFin APT",
    token: "0xaef6a8c3182e076db72d64324617114cacf9a52f28325edc10b483f7f05da0e7",
    decimals: 100000000,
    isFungible: true
  },
  {
    assetName: "eAPT",
    provider: "Echo Protocol",
    token: "0x8a7403ae3d95f181761cf36742680442c698b49e047350b77a8906ec5168bdae",
    decimals: 100000000,
    isFungible: true
  }
];

export default JOULE_TOKENS;
