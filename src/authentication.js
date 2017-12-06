const HEADER_REGEX = /bearer token-(.*)$/;

const authenticate = async ({headers: {authorization}}, Users) => {
  const email = authorization && HEADER_REGEX.exec(authorization)[1];
  return email && await Users.findOne({email});
};

module.exports = {authenticate};
